import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, TrainingSessionStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CancelSessionDto, CreateSessionDto, ListSessionsDto, UpdateSessionDto } from './dto'
import { resolveCallerFilter } from './filters/caller-query-filter'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { SESSION_DETAIL_INCLUDE, SESSION_SUMMARY_INCLUDE, TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainingCaller as Caller } from './training.types'
@Injectable()
export class TrainingSessionService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly caller: TrainingCallerResolverService, private readonly scheduling: TrainingSessionSchedulingService, private readonly presenter: TrainingSessionPresenter, private readonly sessionNotifications: TrainingSessionNotificationService) {}
  async listSessions(dto: ListSessionsDto, caller: Caller) {
    const {
      page = 1,
      pageSize = 20,
      memberId,
      trainerStaffId,
      roomId,
      status,
      from,
      to,
      sort = 'start_time:asc',
    } = dto
    const where: Prisma.TrainingSessionWhereInput = { deletedAt: null }

    const resolvedCaller: Caller = {
      ...caller,
      staffId: caller.staffId ?? (await this.caller.resolveStaffId(caller)) ?? undefined,
      memberId: caller.memberId ?? (await this.caller.resolveMemberId(caller)) ?? undefined,
    }
    if (this.caller.isMemberOnly(caller) && !resolvedCaller.memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }
    if (this.caller.isTrainerOnly(caller) && !resolvedCaller.staffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay staff profile',
      })
    }
    const filter = resolveCallerFilter(resolvedCaller, memberId, trainerStaffId)
    filter.apply(where, resolvedCaller)

    if (roomId) where.roomId = BigInt(roomId)
    if (status) where.status = status as TrainingSessionStatus
    if (from) where.startTime = { ...(where.startTime as object), gte: new Date(from) }
    if (to) where.startTime = { ...(where.startTime as object), lte: new Date(to) }

    const [sortField, sortDir] = sort.split(':')
    const sortKey =
      sortField === 'end_time' ? 'endTime' : sortField === 'status' ? 'status' : 'startTime'
    const orderBy = {
      [sortKey]: sortDir === 'desc' ? 'desc' : 'asc',
    } as Prisma.TrainingSessionOrderByWithRelationInput

    const data = await this.prisma.trainingSession.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: SESSION_SUMMARY_INCLUDE,
    })
    const total = await this.prisma.trainingSession.count({ where })

    return {
      data: data.map((s) => this.presenter.serializeSession(s)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async getSession(id: bigint, caller: Caller) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
      include: SESSION_DETAIL_INCLUDE,
    })
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Session khong ton tai',
      })
    }

    const resolvedCaller: Caller = {
      ...caller,
      staffId: caller.staffId ?? (await this.caller.resolveStaffId(caller)) ?? undefined,
      memberId: caller.memberId ?? (await this.caller.resolveMemberId(caller)) ?? undefined,
    }
    this.caller.checkSessionAccess(session, resolvedCaller)
    return { data: this.presenter.serializeSession(session, true) }
  }

  async createSession(dto: CreateSessionDto, caller: Caller) {
    const isPTOnly = this.caller.isTrainerOnly(caller)
    const callerStaffId = await this.caller.resolveStaffId(caller)

    const memberId = BigInt(dto.memberId)
    const roomId = BigInt(dto.roomId)
    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)

    if (endTime <= startTime) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'endTime phai lon hon startTime',
      })
    }

    const graceTime = new Date(Date.now() + 5 * 60 * 1000)
    if (startTime < graceTime) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'startTime phai trong tuong lai hoac hien tai + grace 5 phut',
      })
    }

    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) {
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Member khong ton tai',
      })
    }

    const room = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!room) {
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Room khong ton tai',
      })
    }

    let trainerStaffId: bigint | null = null
    if (isPTOnly) {
      trainerStaffId = callerStaffId
      if (!trainerStaffId) {
        throw new BadRequestException({
          success: false,
          code: 'FK_CONSTRAINT',
          message: 'Trainer khong ton tai',
        })
      }
      if (member.primaryTrainerId !== trainerStaffId) {
        throw new ForbiddenException({
          success: false,
          code: 'TRAINER_NOT_ASSIGNED',
          message: 'PT chi duoc tao lich cho member co primary trainer la minh',
        })
      }
    } else if (dto.trainerStaffId) {
      trainerStaffId = BigInt(dto.trainerStaffId)
    } else {
      trainerStaffId = callerStaffId
    }

    if (!trainerStaffId) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'trainerStaffId bat buoc',
      })
    }

    const trainer = await this.prisma.staff.findFirst({
      where: { staffId: trainerStaffId, deletedAt: null },
    })
    if (!trainer) {
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Trainer khong ton tai',
      })
    }

    const sessionDate = new Date(
      Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate())
    )
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        memberId,
        status: 'active',
        deletedAt: null,
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate },
      },
    })
    if (!activeSub) {
      throw new ConflictException({
        success: false,
        code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION',
        message: 'Member khong co subscription active tai ngay session',
      })
    }

    await this.scheduling.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP')
    await this.scheduling.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP')

    const planLink = await this.scheduling.resolveSessionPlanLink(
      dto.assignmentId,
      dto.planDayId,
      memberId,
      isPTOnly
    )

    const session = await this.prisma.trainingSession.create({
      data: {
        memberId,
        trainerStaffId,
        roomId,
        assignmentId: planLink?.assignmentId ?? null,
        planDayId: planLink?.planDayId ?? null,
        startTime,
        endTime,
        status: TrainingSessionStatus.scheduled,
      },
      include: SESSION_SUMMARY_INCLUDE,
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.create',
      resourceType: 'training_session',
      resourceId: session.sessionId.toString(),
      afterData: this.presenter.serializeSession(session) as unknown as Record<string, unknown>,
    })

    await this.sessionNotifications.notifyCreated(session, caller.userId)

    return { data: this.presenter.serializeSession(session) }
  }

  async updateSession(id: bigint, dto: UpdateSessionDto, caller: Caller) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
      include: SESSION_SUMMARY_INCLUDE,
    })
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Session khong ton tai',
      })
    }

    const callerStaffId = await this.caller.resolveStaffId(caller)
    const isPTOnly = this.caller.isTrainerOnly(caller)
    if (isPTOnly && session.trainerStaffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen sua session nay',
      })
    }
    if (isPTOnly && dto.trainerStaffId && BigInt(dto.trainerStaffId) !== session.trainerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen doi trainer cua session nay',
      })
    }

    if (
      session.status === TrainingSessionStatus.completed ||
      session.status === TrainingSessionStatus.cancelled ||
      new Date() >= session.startTime
    ) {
      throw new ConflictException({
        success: false,
        code: 'SESSION_ALREADY_STARTED',
        message: 'Session da bat dau hoac hoan tat, khong the sua',
      })
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : session.startTime
    const endTime = dto.endTime ? new Date(dto.endTime) : session.endTime
    if (endTime <= startTime) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'endTime phai lon hon startTime',
      })
    }

    const roomId = dto.roomId ? BigInt(dto.roomId) : session.roomId
    const trainerStaffId = dto.trainerStaffId ? BigInt(dto.trainerStaffId) : session.trainerStaffId

    if (dto.roomId || dto.startTime || dto.endTime) {
      await this.scheduling.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP', id)
      await this.scheduling.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP', id)
    }

    const updated = await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: {
        ...(dto.trainerStaffId ? { trainerStaffId: BigInt(dto.trainerStaffId) } : {}),
        ...(dto.roomId ? { roomId: BigInt(dto.roomId) } : {}),
        ...(dto.startTime ? { startTime } : {}),
        ...(dto.endTime ? { endTime } : {}),
      },
      include: SESSION_SUMMARY_INCLUDE,
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.update',
      resourceType: 'training_session',
      resourceId: id.toString(),
      beforeData: this.presenter.serializeSession(session) as unknown as Record<string, unknown>,
      afterData: this.presenter.serializeSession(updated) as unknown as Record<string, unknown>,
    })

    await this.sessionNotifications.notifyUpdated(session, updated, caller.userId)

    return { data: this.presenter.serializeSession(updated) }
  }

  async cancelSession(id: bigint, dto: CancelSessionDto, caller: Caller) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
    })
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Session khong ton tai',
      })
    }
    if (
      session.status === TrainingSessionStatus.completed ||
      session.status === TrainingSessionStatus.cancelled
    ) {
      throw new ConflictException({
        success: false,
        code: 'SESSION_NOT_CANCELLABLE',
        message: 'Session da hoan tat hoac da huy',
      })
    }

    const callerStaffId = await this.caller.resolveStaffId(caller)
    const isPTOnly = this.caller.isTrainerOnly(caller)
    if (isPTOnly && session.trainerStaffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen huy session nay',
      })
    }

    const cancelled = await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: { status: TrainingSessionStatus.cancelled },
      include: SESSION_SUMMARY_INCLUDE,
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.cancel',
      resourceType: 'training_session',
      resourceId: id.toString(),
      afterData: { reason: dto.reason ?? null, cancelledBy: caller.userId.toString() },
    })

    await this.sessionNotifications.notifyCancelled(cancelled, caller.userId)
  }

  async updateSessionStatus(id: bigint, status: 'in_progress' | 'completed', caller: Caller) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
    })
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Session khong ton tai',
      })
    }

    if (
      session.status === TrainingSessionStatus.completed ||
      session.status === TrainingSessionStatus.cancelled
    ) {
      throw new ConflictException({
        success: false,
        code: 'SESSION_ALREADY_FINISHED',
        message: 'Session da hoan tat hoac da huy, khong the cap nhat trang thai',
      })
    }

    if (status === 'in_progress' && session.status !== TrainingSessionStatus.scheduled) {
      throw new ConflictException({
        success: false,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Chi co the bat dau session dang o trang thai scheduled',
      })
    }

    const callerStaffId = await this.caller.resolveStaffId(caller)
    const isPTOnly = this.caller.isTrainerOnly(caller)
    if (isPTOnly && session.trainerStaffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen cap nhat trang thai session nay',
      })
    }

    const newStatus =
      status === 'in_progress' ? TrainingSessionStatus.in_progress : TrainingSessionStatus.completed

    const updated = await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: { status: newStatus },
      include: {
        ...SESSION_SUMMARY_INCLUDE,
      },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: `training.status.${status}`,
      resourceType: 'training_session',
      resourceId: id.toString(),
      beforeData: { status: session.status },
      afterData: { status: newStatus },
    })

    if (newStatus === TrainingSessionStatus.completed) {
      await this.sessionNotifications.notifyCompleted(updated)
    }

    return { data: this.presenter.serializeSession(updated) }
  }
}
