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
import { ListFeedbackDto } from './dto/list-feedback.dto'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { AssignFeedbackDto } from './dto/assign-feedback.dto'
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto'

const SLA_DAYS: Record<string, number> = { high: 1, medium: 3, low: 7 }

interface FeedbackRow {
  feedbackId: bigint
  memberId: bigint
  member: { memberCode: string; memberId: bigint; user: { fullName: string } }
  feedbackType: FeedbackType
  content: string
  severity: FeedbackSeverity
  status: FeedbackStatus
  createdAt: Date
  handledByStaffId?: bigint | null
  handledAt?: Date | null
  subjectStaffId?: bigint | null
  subjectEquipmentId?: bigint | null
  resolutionNote?: string | null
  deletedAt?: Date | null
  handledByStaff?: { staffId: bigint; user: { fullName: string } } | null
  subjectStaff?: { staffId: bigint; user: { fullName: string } } | null
  subjectEquipment?: { equipmentId: bigint; name: string } | null
}

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // List / Detail
  // ---------------------------------------------------------------------------

  async list(dto: ListFeedbackDto, caller: { userId: bigint; roles: Role[]; memberId?: bigint; staffId?: bigint }) {
    const { page = 1, pageSize = 20, memberId, feedbackType, severity, status, handledByStaffId, subjectStaffId, subjectEquipmentId, overdue, from, to, sort = 'created_at:desc' } = dto
    const { roles } = caller

    const isMember = roles.includes('member')

    const where: Prisma.FeedbackWhereInput = { deletedAt: null }

    if (isMember) {
      if (!caller.memberId) throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không tìm thấy member profile' })
      where.memberId = caller.memberId
    } else {
      if (memberId) where.memberId = BigInt(memberId)
      if (handledByStaffId) where.handledByStaffId = BigInt(handledByStaffId)
    }

    if (feedbackType) where.feedbackType = feedbackType as FeedbackType
    if (severity) where.severity = severity as FeedbackSeverity
    if (status) where.status = status as FeedbackStatus
    if (subjectStaffId) where.subjectStaffId = BigInt(subjectStaffId)
    if (subjectEquipmentId) where.subjectEquipmentId = BigInt(subjectEquipmentId)
    if (from) where.createdAt = { ...(where.createdAt as object) as Record<string, unknown>, gte: new Date(from) }
    if (to) where.createdAt = { ...(where.createdAt as object) as Record<string, unknown>, lte: new Date(to) }

    if (overdue) {
      const now = new Date()
      where.status = { in: ['open', 'in_progress'] }
      where.createdAt = {
        ...(where.createdAt as object) as Record<string, unknown>,
        lte: new Date(now.getTime() - SLA_DAYS[severity ?? 'low'] * 24 * 60 * 60 * 1000),
      }
    }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = {
      [sortField === 'created_at' ? 'createdAt' : sortField === 'severity' ? 'severity' : 'status']: sortDir === 'asc' ? 'asc' : 'desc',
    } as Prisma.FeedbackOrderByWithRelationInput

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        },
      }),
      this.prisma.feedback.count({ where }),
    ])

    return {
      data: data.map((f) => this.serialize(f)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async get(id: bigint, caller: { userId: bigint; roles: Role[]; memberId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId: id, deletedAt: null },
      include: {
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        handledByStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
      },
    })
    if (!feedback) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Feedback không tồn tại' })

    if (caller.roles.includes('member') && feedback.memberId !== caller.memberId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền truy cập feedback này' })
    }

    return { data: this.serialize(feedback, true) }
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(dto: CreateFeedbackDto, caller: { userId: bigint; roles: Role[]; memberId?: bigint }) {
    const isMember = caller.roles.includes('member')

    let memberId: bigint
    if (isMember) {
      if (dto.memberId && BigInt(dto.memberId) !== caller.memberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không được tạo feedback cho member khác' })
      }
      memberId = caller.memberId!
    } else {
      if (!dto.memberId) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'memberId là bắt buộc khi staff tạo feedback' })
      memberId = BigInt(dto.memberId)
    }

    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Member không tồn tại' })

    const feedbackType = dto.feedbackType as FeedbackType
    if (feedbackType === 'staff' && dto.subjectEquipmentId) {
      throw new BadRequestException({ success: false, code: 'FEEDBACK_SUBJECT_MISMATCH', message: 'feedbackType staff không được có subjectEquipmentId' })
    }
    if (feedbackType === 'equipment' && dto.subjectStaffId) {
      throw new BadRequestException({ success: false, code: 'FEEDBACK_SUBJECT_MISMATCH', message: 'feedbackType equipment không được có subjectStaffId' })
    }
    if (feedbackType === 'service' && (dto.subjectStaffId || dto.subjectEquipmentId)) {
      throw new BadRequestException({ success: false, code: 'FEEDBACK_SUBJECT_MISMATCH', message: 'feedbackType service không được có subject' })
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        memberId,
        feedbackType,
        content: dto.content,
        severity: (dto.severity ?? 'low') as FeedbackSeverity,
        subjectStaffId: dto.subjectStaffId ? BigInt(dto.subjectStaffId) : null,
        subjectEquipmentId: dto.subjectEquipmentId ? BigInt(dto.subjectEquipmentId) : null,
      },
      include: {
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'feedback.create', resourceType: 'feedback', resourceId: feedback.feedbackId.toString(), afterData: this.serialize(feedback) as unknown as Record<string, unknown> })

    return { data: this.serialize(feedback) }
  }

  // ---------------------------------------------------------------------------
  // Delete (soft)
  // ---------------------------------------------------------------------------

  async softDelete(id: bigint, caller: { userId: bigint; roles: Role[]; memberId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({ where: { feedbackId: id, deletedAt: null } })
    if (!feedback) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Feedback không tồn tại' })

    if (caller.roles.includes('member') && feedback.memberId !== caller.memberId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền xóa feedback này' })
    }

    await this.prisma.feedback.update({ where: { feedbackId: id }, data: { deletedAt: new Date() } })
    this.audit.log({ actorUserId: caller.userId, action: 'feedback.delete', resourceType: 'feedback', resourceId: id.toString() })
  }

  // ---------------------------------------------------------------------------
  // Assign
  // ---------------------------------------------------------------------------

  async assign(id: bigint, dto: AssignFeedbackDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({ where: { feedbackId: id, deletedAt: null } })
    if (!feedback) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Feedback không tồn tại' })

    if (feedback.status === 'resolved' || feedback.status === 'rejected') {
      throw new ConflictException({ success: false, code: 'FEEDBACK_ALREADY_CLOSED', message: 'Feedback đã được xử lý xong' })
    }

    if (feedback.status === 'in_progress' && feedback.handledByStaffId && dto.handledByStaffId && BigInt(dto.handledByStaffId) !== feedback.handledByStaffId) {
      throw new ConflictException({ success: false, code: 'FEEDBACK_ALREADY_ASSIGNED', message: 'Feedback đang được xử lý bởi người khác' })
    }

    const handledByStaffId = dto.handledByStaffId ? BigInt(dto.handledByStaffId) : caller.staffId!

    const updated = await this.prisma.feedback.update({
      where: { feedbackId: id },
      data: {
        handledByStaff: { connect: { staffId: handledByStaffId } },
        status: FeedbackStatus.in_progress,
      },
      include: {
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        handledByStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'feedback.assign', resourceType: 'feedback', resourceId: id.toString(), beforeData: { status: feedback.status }, afterData: { status: 'in_progress', handledByStaffId: handledByStaffId.toString() } })

    return { data: this.serialize(updated, true) }
  }

  // ---------------------------------------------------------------------------
  // Update Status
  // ---------------------------------------------------------------------------

  async updateStatus(id: bigint, dto: UpdateFeedbackStatusDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint }) {
    const feedback = await this.prisma.feedback.findFirst({ where: { feedbackId: id, deletedAt: null } })
    if (!feedback) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Feedback không tồn tại' })

    if (feedback.status === 'resolved' || feedback.status === 'rejected') {
      throw new ConflictException({ success: false, code: 'FEEDBACK_ALREADY_CLOSED', message: 'Feedback đã được xử lý xong' })
    }

    const newStatus = dto.status as FeedbackStatus
    if (
      (feedback.status === 'open' && newStatus === 'resolved') ||
      (feedback.status === 'open' && newStatus === 'rejected')
    ) {
      throw new ConflictException({ success: false, code: 'FEEDBACK_INVALID_STATE_TRANSITION', message: 'Feedback phải qua in_progress trước khi resolved/rejected' })
    }

    const data: Prisma.FeedbackUpdateInput = {}
    if (dto.severity) data.severity = dto.severity as FeedbackSeverity

    if (newStatus === 'resolved' || newStatus === 'rejected') {
      if (!dto.resolutionNote) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'resolutionNote là bắt buộc khi resolved/rejected' })
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
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        handledByStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectStaff: { select: { staffId: true, user: { select: { fullName: true } } } },
        subjectEquipment: { select: { equipmentId: true, name: true } },
      },
    })

    const action = newStatus === 'resolved' ? 'feedback.resolve' : newStatus === 'rejected' ? 'feedback.reject' : 'feedback.update'
    this.audit.log({ actorUserId: caller.userId, action, resourceType: 'feedback', resourceId: id.toString(), beforeData: { status: feedback.status }, afterData: { status: newStatus, resolutionNote: dto.resolutionNote } })

    return { data: this.serialize(updated, true) }
  }

  // ---------------------------------------------------------------------------
  // Serializers
  // ---------------------------------------------------------------------------

  private computeSLA(createdAt: Date, severity: FeedbackSeverity) {
    const dueAt = new Date(createdAt.getTime() + SLA_DAYS[severity] * 24 * 60 * 60 * 1000)
    return { dueAt, overdue: new Date() > dueAt }
  }

  private serialize(f: FeedbackRow, detail = false) {
    const base: Record<string, unknown> = {
      feedbackId: f.feedbackId.toString(),
      memberId: f.memberId.toString(),
      memberCode: f.member.memberCode,
      feedbackType: f.feedbackType,
      content: f.content,
      severity: f.severity,
      status: f.status,
      createdAt: f.createdAt,
    }

    if (detail) {
      return {
        ...base,
        member: { memberId: f.member.memberId.toString(), memberCode: f.member.memberCode, fullName: f.member.user.fullName },
        handledByStaff: f.handledByStaff ? { staffId: f.handledByStaff.staffId.toString(), fullName: f.handledByStaff.user.fullName } : null,
        subjectStaff: f.subjectStaff ? { staffId: f.subjectStaff.staffId.toString(), fullName: f.subjectStaff.user.fullName } : null,
        subjectEquipment: f.subjectEquipment ? { equipmentId: f.subjectEquipment.equipmentId.toString(), name: f.subjectEquipment.name } : null,
        handledAt: f.handledAt,
        createdAt: f.createdAt,
        deletedAt: f.deletedAt,
        sla: this.computeSLA(f.createdAt, f.severity),
      }
    }

    return {
      ...base,
      handledByStaffId: f.handledByStaffId?.toString() ?? null,
      handledAt: f.handledAt,
      subjectStaffId: f.subjectStaffId?.toString() ?? null,
      subjectEquipmentId: f.subjectEquipmentId?.toString() ?? null,
      response: f.resolutionNote ?? null,
      sla: this.computeSLA(f.createdAt, f.severity),
    }
  }
}
