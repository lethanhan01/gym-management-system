import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { FeedbackSeverity, FeedbackStatus, FeedbackType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { type Role } from '../auth/users.service'
import { NotificationsService } from '../notifications/notifications.service'
import { LineMessagingService } from '../line-messaging/line-messaging.service'
import { ListFeedbackDto } from './dto/list-feedback.dto'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { AssignFeedbackDto } from './dto/assign-feedback.dto'
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto'

const SLA_DAYS: Record<string, number> = { high: 1, medium: 3, low: 7 }

export interface FeedbackRow {
  feedbackId: bigint
  memberId: bigint
  member: { memberCode: string; memberId: bigint; userId?: bigint; user: { fullName: string } }
  feedbackType: FeedbackType
  content: string
  rating?: number | null
  tags?: string[] | null
  isAnonymous?: boolean | null
  imageUrls?: string[] | null
  severity: FeedbackSeverity
  status: FeedbackStatus
  createdAt: Date
  handledByStaffId?: bigint | null
  handledAt?: Date | null
  subjectStaffId?: bigint | null
  subjectEquipmentId?: bigint | null
  subjectRoomId?: bigint | null
  sessionId?: bigint | null
  resolutionNote?: string | null
  deletedAt?: Date | null
  handledByStaff?: { staffId: bigint; userId?: bigint; user: { fullName: string } } | null
  subjectStaff?: { staffId: bigint; user: { fullName: string } } | null
  subjectEquipment?: { equipmentId: bigint; name: string } | null
  subjectRoom?: { roomId: bigint; name: string } | null
  session?: { sessionId: bigint; startTime: Date; endTime: Date } | null
}

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly lineMessaging: LineMessagingService
  ) {}

  // ---------------------------------------------------------------------------
  // List / Detail
  // ---------------------------------------------------------------------------

  async list(
    dto: ListFeedbackDto,
    caller: { userId: bigint; roles: Role[]; memberId?: bigint; staffId?: bigint }
  ) {
    const {
      page = 1,
      pageSize = 20,
      memberId,
      feedbackType,
      rating,
      severity,
      status,
      handledByStaffId,
      subjectStaffId,
      subjectEquipmentId,
      subjectRoomId,
      sessionId,
      overdue,
      from,
      to,
      sort = 'created_at:desc',
    } = dto
    const { roles } = caller

    const isMember = roles.includes('member')

    const where: Prisma.FeedbackWhereInput = { deletedAt: null }

    if (isMember) {
      if (!caller.memberId)
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không tìm thấy member profile',
        })
      where.memberId = caller.memberId
    } else {
      if (memberId) where.memberId = BigInt(memberId)
      if (handledByStaffId) where.handledByStaffId = BigInt(handledByStaffId)
    }

    if (feedbackType) where.feedbackType = feedbackType as FeedbackType
    if (rating) where.rating = rating
    if (severity) where.severity = severity as FeedbackSeverity
    if (status) where.status = status as FeedbackStatus
    if (subjectStaffId) where.subjectStaffId = BigInt(subjectStaffId)
    if (subjectEquipmentId) where.subjectEquipmentId = BigInt(subjectEquipmentId)
    if (subjectRoomId) where.subjectRoomId = BigInt(subjectRoomId)
    if (sessionId) where.sessionId = BigInt(sessionId)

    if (from)
      where.createdAt = {
        ...(where.createdAt as object as Record<string, unknown>),
        gte: new Date(from),
      }
    if (to)
      where.createdAt = {
        ...(where.createdAt as object as Record<string, unknown>),
        lte: new Date(to),
      }

    if (overdue) {
      const now = new Date()
      where.status = { in: ['open', 'in_progress'] }
      where.createdAt = {
        ...(where.createdAt as object as Record<string, unknown>),
        lte: new Date(now.getTime() - SLA_DAYS[severity ?? 'low'] * 24 * 60 * 60 * 1000),
      }
    }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = {
      [sortField === 'created_at' ? 'createdAt' : sortField === 'severity' ? 'severity' : 'status']:
        sortDir === 'asc' ? 'asc' : 'desc',
    } as Prisma.FeedbackOrderByWithRelationInput

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          member: {
            select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
          },
          subjectStaff: {
            select: { staffId: true, user: { select: { fullName: true } } },
          },
          subjectEquipment: {
            select: { equipmentId: true, name: true },
          },
          subjectRoom: {
            select: { roomId: true, name: true },
          },
          session: {
            select: { sessionId: true, startTime: true, endTime: true },
          },
        },
      }),
      this.prisma.feedback.count({ where }),
    ])

    return {
      data: data.map((f) => this.serialize(f as unknown as FeedbackRow, false, caller)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async get(id: bigint, caller: { userId: bigint; roles: Role[]; memberId?: bigint; staffId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId: id, deletedAt: null },
      include: {
        member: {
          select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
        },
        handledByStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
        subjectRoom: { select: { roomId: true, name: true } },
        session: { select: { sessionId: true, startTime: true, endTime: true } },
      },
    })
    if (!feedback)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Feedback không tồn tại',
      })

    if (caller.roles.includes('member') && feedback.memberId !== caller.memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Không có quyền truy cập feedback này',
      })
    }

    return { data: this.serialize(feedback as unknown as FeedbackRow, true, caller) }
  }

  // ---------------------------------------------------------------------------
  // Options for feedback form
  // ---------------------------------------------------------------------------

  async getFeedbackOptions(memberId?: bigint) {
    const allStaffWithUser = await this.prisma.staff.findMany({
      where: { deletedAt: null },
      select: {
        staffId: true,
        staffCode: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
      orderBy: { staffCode: 'asc' },
    })

    const assignedTrainerIds = new Set<string>()
    let recentSessions: Array<{
      sessionId: string
      trainerStaffId: string
      trainerName: string
      roomName: string
      startTime: Date
      endTime: Date
    }> = []

    if (memberId) {
      const member = await this.prisma.member.findUnique({
        where: { memberId },
        select: { primaryTrainerId: true },
      })
      if (member?.primaryTrainerId) {
        assignedTrainerIds.add(member.primaryTrainerId.toString())
      }

      const sessions = await this.prisma.trainingSession.findMany({
        where: { memberId, deletedAt: null },
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
          room: { select: { name: true } },
        },
      })

      sessions.forEach((s) => {
        assignedTrainerIds.add(s.trainerStaffId.toString())
      })

      recentSessions = sessions.map((s) => ({
        sessionId: s.sessionId.toString(),
        trainerStaffId: s.trainerStaffId.toString(),
        trainerName: s.trainer.user.fullName,
        roomName: s.room.name,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    }

    const allTrainers = allStaffWithUser.map((s) => ({
      staffId: s.staffId.toString(),
      staffCode: s.staffCode,
      fullName: s.user.fullName,
      phone: s.user.phone,
    }))

    const assignedTrainers = allTrainers.filter((t) => assignedTrainerIds.has(t.staffId))

    const [rooms, equipment] = await Promise.all([
      this.prisma.gymRoom.findMany({
        select: { roomId: true, roomCode: true, name: true, roomType: true },
        orderBy: { roomCode: 'asc' },
      }),
      this.prisma.equipment.findMany({
        where: { status: 'active' },
        select: { equipmentId: true, equipmentCode: true, name: true, roomId: true },
        orderBy: { equipmentCode: 'asc' },
      }),
    ])

    const quickTags = {
      staff: {
        positive: [
          '#ChuyênMônCao',
          '#NhiệtTìnhTậnTâm',
          '#ĐúngGiờ',
          '#ĐộngLựcTốt',
          '#GiáoÁnPhùHợp',
          '#TheoSátKỹThuật',
        ],
        negative: [
          '#ĐếnMuộn',
          '#HủyLịchSátGiờ',
          '#TháiĐộChưaTốt',
          '#DùngĐiệnThoạiKhiDạy',
          '#BàiTậpQuáSức',
          '#ÍtChỉDẫnKỹThuật',
        ],
      },
      facility: {
        positive: [
          '#PhòngSạchSẽ',
          '#MáyMócMớiÊm',
          '#KhôngGianThoáng',
          '#ĐiềuHòaMátMẻ',
          '#ÂmNhạcVừaPhải',
          '#PhòngTắmSạch',
        ],
        negative: [
          '#MáyHỏngKẹtTạ',
          '#VệSinhChưaSạch',
          '#PhòngQuáNóng',
          '#ThiếuTạPhụKiện',
          '#MùiKhóChịu',
          '#PhòngQuáĐông',
        ],
      },
    }

    return {
      trainers: {
        assigned: assignedTrainers,
        all: allTrainers,
      },
      recentSessions,
      rooms: rooms.map((r) => ({
        roomId: r.roomId.toString(),
        roomCode: r.roomCode,
        name: r.name,
        roomType: r.roomType,
      })),
      equipment: equipment.map((e) => ({
        equipmentId: e.equipmentId.toString(),
        equipmentCode: e.equipmentCode,
        name: e.name,
        roomId: e.roomId.toString(),
      })),
      quickTags,
    }
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateFeedbackDto,
    caller: { userId: bigint; roles: Role[]; memberId?: bigint }
  ) {
    const isMember = caller.roles.includes('member')

    let memberId: bigint
    if (isMember) {
      if (dto.memberId && BigInt(dto.memberId) !== caller.memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không được tạo feedback cho member khác',
        })
      }
      memberId = caller.memberId!
    } else {
      if (!dto.memberId)
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'memberId là bắt buộc khi staff tạo feedback',
        })
      memberId = BigInt(dto.memberId)
    }

    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member)
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Member không tồn tại',
      })

    const feedbackType = dto.feedbackType as FeedbackType
    if (feedbackType === 'staff' && (dto.subjectEquipmentId || dto.subjectRoomId)) {
      throw new BadRequestException({
        success: false,
        code: 'FEEDBACK_SUBJECT_MISMATCH',
        message: 'feedbackType staff không được có subjectEquipmentId hoặc subjectRoomId',
      })
    }
    if ((feedbackType === 'equipment' || feedbackType === 'facility') && dto.subjectStaffId) {
      throw new BadRequestException({
        success: false,
        code: 'FEEDBACK_SUBJECT_MISMATCH',
        message: 'feedbackType facility/equipment không được có subjectStaffId',
      })
    }
    if (feedbackType === 'service' && (dto.subjectStaffId || dto.subjectEquipmentId || dto.subjectRoomId)) {
      throw new BadRequestException({
        success: false,
        code: 'FEEDBACK_SUBJECT_MISMATCH',
        message: 'feedbackType service không được có subject',
      })
    }

    // Auto-routing logic based on rating & severity
    const rating = dto.rating ?? 5
    let status: FeedbackStatus = FeedbackStatus.open
    let severity: FeedbackSeverity = (dto.severity as FeedbackSeverity) ?? FeedbackSeverity.low

    if (rating >= 4) {
      status = FeedbackStatus.resolved
      severity = (dto.severity as FeedbackSeverity) ?? FeedbackSeverity.low
    } else if (rating === 3) {
      status = FeedbackStatus.open
      severity = (dto.severity as FeedbackSeverity) ?? FeedbackSeverity.medium
    } else {
      // rating 1 or 2
      status = FeedbackStatus.open
      severity = (dto.severity as FeedbackSeverity) ?? FeedbackSeverity.high
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        memberId,
        feedbackType,
        content: dto.content,
        rating,
        tags: dto.tags ?? [],
        isAnonymous: dto.isAnonymous ?? false,
        imageUrls: dto.imageUrls ?? [],
        severity,
        status,
        subjectStaffId: dto.subjectStaffId ? BigInt(dto.subjectStaffId) : null,
        subjectEquipmentId: dto.subjectEquipmentId ? BigInt(dto.subjectEquipmentId) : null,
        subjectRoomId: dto.subjectRoomId ? BigInt(dto.subjectRoomId) : null,
        sessionId: dto.sessionId ? BigInt(dto.sessionId) : null,
      },
      include: {
        member: {
          select: {
            memberId: true,
            memberCode: true,
            userId: true,
            user: { select: { fullName: true } },
          },
        },
        subjectStaff: {
          select: { staffId: true, user: { select: { fullName: true } } },
        },
        subjectEquipment: {
          select: { equipmentId: true, name: true },
        },
        subjectRoom: {
          select: { roomId: true, name: true },
        },
      },
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'feedback.create',
      resourceType: 'feedback',
      resourceId: feedback.feedbackId.toString(),
      afterData: this.serialize(feedback as unknown as FeedbackRow) as unknown as Record<string, unknown>,
    })

    if (isMember) {
      await this.notifications.safeNotifyGroups(
        ['owner', 'staff'],
        {
          type: 'feedback.created',
          title: rating >= 4 ? 'Đánh giá tích cực mới' : 'Phản hồi cần xử lý',
          message:
            rating >= 4
              ? `Hội viên vừa đánh giá ${rating} sao.`
              : `Có một phản hồi (${rating} sao) cần xử lý từ hội viên.`,
          resourceType: 'feedback',
          resourceId: feedback.feedbackId.toString(),
          dedupeKey: `feedback:${feedback.feedbackId.toString()}:created`,
        },
        { excludeActorUserId: caller.userId }
      )
    }

    return { data: this.serialize(feedback as unknown as FeedbackRow, false, caller) }
  }

  // ---------------------------------------------------------------------------
  // Delete (soft)
  // ---------------------------------------------------------------------------

  async softDelete(id: bigint, caller: { userId: bigint; roles: Role[]; memberId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId: id, deletedAt: null },
    })
    if (!feedback)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Feedback không tồn tại',
      })

    if (caller.roles.includes('member') && feedback.memberId !== caller.memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Không có quyền xóa feedback này',
      })
    }

    await this.prisma.feedback.update({
      where: { feedbackId: id },
      data: { deletedAt: new Date() },
    })
    this.audit.log({
      actorUserId: caller.userId,
      action: 'feedback.delete',
      resourceType: 'feedback',
      resourceId: id.toString(),
    })
  }

  // ---------------------------------------------------------------------------
  // Assign
  // ---------------------------------------------------------------------------

  async assign(
    id: bigint,
    dto: AssignFeedbackDto,
    caller: { userId: bigint; roles: Role[]; staffId?: bigint }
  ) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId: id, deletedAt: null },
    })
    if (!feedback)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Feedback không tồn tại',
      })

    if (feedback.status === 'resolved' || feedback.status === 'rejected') {
      throw new ConflictException({
        success: false,
        code: 'FEEDBACK_ALREADY_CLOSED',
        message: 'Feedback đã được xử lý xong',
      })
    }

    if (
      feedback.status === 'in_progress' &&
      feedback.handledByStaffId &&
      dto.handledByStaffId &&
      BigInt(dto.handledByStaffId) !== feedback.handledByStaffId
    ) {
      throw new ConflictException({
        success: false,
        code: 'FEEDBACK_ALREADY_ASSIGNED',
        message: 'Feedback đang được xử lý bởi người khác',
      })
    }

    const handledByStaffId = dto.handledByStaffId ? BigInt(dto.handledByStaffId) : caller.staffId!

    const updated = await this.prisma.feedback.update({
      where: { feedbackId: id },
      data: {
        handledByStaff: { connect: { staffId: handledByStaffId } },
        status: FeedbackStatus.in_progress,
      },
      include: {
        member: {
          select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
        },
        handledByStaff: {
          select: { staffId: true, userId: true, user: { select: { fullName: true } } },
        },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
        subjectRoom: { select: { roomId: true, name: true } },
      },
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'feedback.assign',
      resourceType: 'feedback',
      resourceId: id.toString(),
      beforeData: { status: feedback.status },
      afterData: { status: 'in_progress', handledByStaffId: handledByStaffId.toString() },
    })

    await this.notifications.safeNotifyManyUsers(
      [updated.handledByStaff?.userId],
      {
        type: 'feedback.assigned',
        title: 'Ban duoc giao xu ly phan hoi',
        message: 'Mot phan hoi vua duoc giao cho ban xu ly.',
        resourceType: 'feedback',
        resourceId: id.toString(),
        dedupeKey: `feedback:${id.toString()}:assigned:${handledByStaffId.toString()}`,
      },
      { excludeActorUserId: caller.userId }
    )

    return { data: this.serialize(updated as unknown as FeedbackRow, true, caller) }
  }

  // ---------------------------------------------------------------------------
  // Update Status
  // ---------------------------------------------------------------------------

  async updateStatus(
    id: bigint,
    dto: UpdateFeedbackStatusDto,
    caller: { userId: bigint; roles: Role[]; staffId?: bigint }
  ) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId: id, deletedAt: null },
    })
    if (!feedback)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Feedback không tồn tại',
      })

    if (feedback.status === 'resolved' || feedback.status === 'rejected') {
      throw new ConflictException({
        success: false,
        code: 'FEEDBACK_ALREADY_CLOSED',
        message: 'Feedback đã được xử lý xong',
      })
    }

    const newStatus = dto.status as FeedbackStatus
    if (
      (feedback.status === 'open' && newStatus === 'resolved') ||
      (feedback.status === 'open' && newStatus === 'rejected')
    ) {
      throw new ConflictException({
        success: false,
        code: 'FEEDBACK_INVALID_STATE_TRANSITION',
        message: 'Feedback phải qua in_progress trước khi resolved/rejected',
      })
    }

    const data: Prisma.FeedbackUpdateInput = {}
    if (dto.severity) data.severity = dto.severity as FeedbackSeverity

    if (newStatus === 'resolved' || newStatus === 'rejected') {
      if (!dto.resolutionNote)
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'resolutionNote là bắt buộc khi resolved/rejected',
        })
      data.status = newStatus
      data.handledAt = new Date()
      data.handledByStaff = caller.staffId ? { connect: { staffId: caller.staffId } } : undefined
    } else {
      data.status = newStatus
    }

    const updated = await this.prisma.feedback.update({
      where: { feedbackId: id },
      data,
      include: {
        member: {
          select: {
            memberId: true,
            memberCode: true,
            userId: true,
            user: { select: { fullName: true } },
          },
        },
        handledByStaff: {
          select: { staffId: true, userId: true, user: { select: { fullName: true } } },
        },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
        subjectRoom: { select: { roomId: true, name: true } },
      },
    })

    const action =
      newStatus === 'resolved'
        ? 'feedback.resolve'
        : newStatus === 'rejected'
          ? 'feedback.reject'
          : 'feedback.update'
    this.audit.log({
      actorUserId: caller.userId,
      action,
      resourceType: 'feedback',
      resourceId: id.toString(),
      beforeData: { status: feedback.status },
      afterData: { status: newStatus, resolutionNote: dto.resolutionNote },
    })

    if (newStatus === FeedbackStatus.resolved || newStatus === FeedbackStatus.rejected) {
      await this.notifications.safeNotifyUser(updated.member.userId, {
        type: newStatus === FeedbackStatus.resolved ? 'feedback.resolved' : 'feedback.rejected',
        title:
          newStatus === FeedbackStatus.resolved
            ? 'Phan hoi da duoc giai quyet'
            : 'Phan hoi da bi tu choi',
        message:
          newStatus === FeedbackStatus.resolved
            ? 'Phan hoi cua ban da duoc xu ly.'
            : 'Phan hoi cua ban da bi tu choi.',
        resourceType: 'feedback',
        resourceId: id.toString(),
        dedupeKey: `feedback:${id.toString()}:${newStatus}`,
      })
      await this.lineMessaging.safePushFeedbackResponded(id)
    }

    return { data: this.serialize(updated as unknown as FeedbackRow, true, caller) }
  }

  // ---------------------------------------------------------------------------
  // Serializers
  // ---------------------------------------------------------------------------

  private computeSLA(createdAt: Date, severity: FeedbackSeverity) {
    const dueAt = new Date(createdAt.getTime() + SLA_DAYS[severity] * 24 * 60 * 60 * 1000)
    return { dueAt, overdue: new Date() > dueAt }
  }

  private serialize(
    f: FeedbackRow,
    detail = false,
    caller?: { userId?: bigint; roles?: Role[]; memberId?: bigint; staffId?: bigint }
  ) {
    let memberData = {
      memberId: f.member?.memberId ? f.member.memberId.toString() : f.memberId.toString(),
      memberCode: f.member?.memberCode ?? '',
      fullName: f.member?.user?.fullName ?? '',
    }

    const isAnonymous = f.isAnonymous ?? false
    const isCallerAuthor = caller?.memberId && caller.memberId === f.memberId
    const isCallerOwnerOrAdmin = caller?.roles?.includes('owner')
    const isCallerTargetTrainer =
      (caller?.roles?.includes('trainer') && !caller?.roles?.includes('owner')) ||
      (caller?.staffId && f.subjectStaffId && caller.staffId === f.subjectStaffId)

    if (isAnonymous && isCallerTargetTrainer && !isCallerAuthor && !isCallerOwnerOrAdmin) {
      memberData = {
        memberId: '',
        memberCode: 'ANONYMOUS',
        fullName: 'Hội viên ẩn danh',
      }
    }

    const base: Record<string, unknown> = {
      feedbackId: f.feedbackId.toString(),
      memberId: memberData.memberId || f.memberId.toString(),
      memberCode: memberData.memberCode,
      feedbackType: f.feedbackType,
      content: f.content,
      rating: f.rating ?? 5,
      tags: f.tags ?? [],
      isAnonymous,
      imageUrls: f.imageUrls ?? [],
      severity: f.severity,
      status: f.status,
      createdAt: f.createdAt,
      subjectStaffId: f.subjectStaffId?.toString() ?? null,
      subjectStaffName: f.subjectStaff?.user?.fullName ?? null,
      subjectEquipmentId: f.subjectEquipmentId?.toString() ?? null,
      subjectEquipmentName: f.subjectEquipment?.name ?? null,
      subjectRoomId: f.subjectRoomId?.toString() ?? null,
      subjectRoomName: f.subjectRoom?.name ?? null,
      sessionId: f.sessionId?.toString() ?? null,
    }

    if (detail) {
      return {
        ...base,
        member: memberData,
        handledByStaff: f.handledByStaff
          ? {
              staffId: f.handledByStaff.staffId.toString(),
              fullName: f.handledByStaff.user.fullName,
            }
          : null,
        subjectStaff: f.subjectStaff
          ? { staffId: f.subjectStaff.staffId.toString(), fullName: f.subjectStaff.user.fullName }
          : null,
        subjectEquipment: f.subjectEquipment
          ? {
              equipmentId: f.subjectEquipment.equipmentId.toString(),
              name: f.subjectEquipment.name,
            }
          : null,
        subjectRoom: f.subjectRoom
          ? {
              roomId: f.subjectRoom.roomId.toString(),
              name: f.subjectRoom.name,
            }
          : null,
        session: f.session
          ? {
              sessionId: f.session.sessionId.toString(),
              startTime: f.session.startTime,
              endTime: f.session.endTime,
            }
          : null,
        handledAt: f.handledAt,
        createdAt: f.createdAt,
        deletedAt: f.deletedAt,
        sla: this.computeSLA(f.createdAt, f.severity),
      }
    }

    return {
      ...base,
      member: memberData,
      handledByStaffId: f.handledByStaffId?.toString() ?? null,
      handledAt: f.handledAt,
      response: f.resolutionNote ?? null,
      sla: this.computeSLA(f.createdAt, f.severity),
    }
  }
}
