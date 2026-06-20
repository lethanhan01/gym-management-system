import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, TrainingSessionStatus, WorkoutAssignmentStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { AttendanceService, AttendanceRow } from './attendance.service'
import { DeviceAccessService } from './device-access.service'
import { CancelSessionDto } from './dto/cancel-session.dto'
import { CheckoutDto } from './dto/checkout.dto'
import { CreateProgressDto } from './dto/create-progress.dto'
import { CreateSessionDto } from './dto/create-session.dto'
import { ListAttendanceLogsDto } from './dto/list-attendance.dto'
import { ListSessionsDto } from './dto/list-sessions.dto'
import { ManualCheckinDto } from './dto/manual-checkin.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { resolveCallerFilter } from './filters/caller-query-filter'

type Caller = {
  userId: bigint
  roles: string[]
  staffId?: bigint
  memberId?: bigint
}

interface SessionRow {
  sessionId: bigint
  memberId: bigint
  member: { user: { fullName: string } }
  trainerStaffId: bigint
  trainer: { user: { fullName: string } }
  roomId: bigint
  room: { name: string }
  assignmentId: bigint | null
  assignment: {
    assignmentId: bigint
    planId: bigint
    plan?: {
      planId: bigint
      name: string
      description: string | null
      status: string
    } | null
  } | null
  planDayId: bigint | null
  planDay: {
    planDayId: bigint
    planId: bigint
    dayNumber: number
    weekNumber: number
    dayOfWeek: number
    name: string
    notes?: string | null
    exercises?: Array<{
      planExerciseId: bigint
      planDayId: bigint
      exerciseId: bigint
      orderIndex: number
      targetSets: number
      targetReps: number | null
      targetDurationSec: number | null
      targetWeightKg: Prisma.Decimal | number | string | null
      restSeconds: number | null
      notes: string | null
      exercise?: {
        exerciseId: bigint
        name: string
        category: string
        muscleGroup: string | null
        equipmentNeeded: string | null
        description: string | null
        imageUrl: string | null
        createdByStaffId: bigint | null
        createdAt: Date
        deletedAt: Date | null
      } | null
    }>
  } | null
  startTime: Date
  endTime: Date | null
  status: string
  attendanceLogs?: AttendanceRow[]
}


const SESSION_PLAN_SELECT = {
  planId: true,
  name: true,
  description: true,
  status: true,
} satisfies Prisma.WorkoutPlanSelect

const SESSION_PLAN_DAY_SELECT = {
  planDayId: true,
  planId: true,
  dayNumber: true,
  weekNumber: true,
  dayOfWeek: true,
  name: true,
  notes: true,
} satisfies Prisma.WorkoutPlanDaySelect

const SESSION_SUMMARY_INCLUDE = {
  member: { select: { memberId: true, user: { select: { fullName: true } } } },
  trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
  room: { select: { roomId: true, name: true } },
  assignment: {
    select: {
      assignmentId: true,
      planId: true,
      plan: { select: SESSION_PLAN_SELECT },
    },
  },
  planDay: { select: SESSION_PLAN_DAY_SELECT },
} satisfies Prisma.TrainingSessionInclude

const SESSION_DETAIL_INCLUDE = {
  ...SESSION_SUMMARY_INCLUDE,
  planDay: {
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: { exercise: true },
      },
    },
  },
  attendanceLogs: {
    include: {
      member: {
        select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
      },
      subscription: { select: { subscriptionId: true, endDate: true } },
    },
  },
} satisfies Prisma.TrainingSessionInclude

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly attendance: AttendanceService,
    private readonly deviceAccess: DeviceAccessService,
  ) {}

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
      staffId: caller.staffId ?? (await this.resolveCallerStaffId(caller)) ?? undefined,
      memberId: caller.memberId ?? (await this.resolveCallerMemberId(caller)) ?? undefined,
    }
    if (this.isMemberOnly(caller) && !resolvedCaller.memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }
    if (this.isTrainerOnly(caller) && !resolvedCaller.staffId) {
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

    const [data, total] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: SESSION_SUMMARY_INCLUDE,
      }),
      this.prisma.trainingSession.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeSession(s)),
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
      staffId: caller.staffId ?? (await this.resolveCallerStaffId(caller)) ?? undefined,
      memberId: caller.memberId ?? (await this.resolveCallerMemberId(caller)) ?? undefined,
    }
    this.checkSessionAccess(session, resolvedCaller)
    return { data: this.serializeSession(session, true) }
  }

  async createSession(dto: CreateSessionDto, caller: Caller) {
    const isPTOnly = this.isTrainerOnly(caller)
    const callerStaffId = await this.resolveCallerStaffId(caller)

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

    await this.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP')
    await this.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP')

    const planLink = await this.resolveSessionPlanLink(
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
      afterData: this.serializeSession(session) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSession(session) }
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

    const callerStaffId = await this.resolveCallerStaffId(caller)
    const isPTOnly = this.isTrainerOnly(caller)
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
      await this.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP', id)
      await this.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP', id)
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
      beforeData: this.serializeSession(session) as unknown as Record<string, unknown>,
      afterData: this.serializeSession(updated) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSession(updated) }
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

    const callerStaffId = await this.resolveCallerStaffId(caller)
    const isPTOnly = this.isTrainerOnly(caller)
    if (isPTOnly && session.trainerStaffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen huy session nay',
      })
    }

    await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: { status: TrainingSessionStatus.cancelled },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.cancel',
      resourceType: 'training_session',
      resourceId: id.toString(),
      afterData: { reason: dto.reason ?? null, cancelledBy: caller.userId.toString() },
    })
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

    const callerStaffId = await this.resolveCallerStaffId(caller)
    const isPTOnly = this.isTrainerOnly(caller)
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

    return { data: this.serializeSession(updated) }
  }

  async listAttendance(dto: ListAttendanceLogsDto, caller: Caller) {
    return this.attendance.listAttendance(dto, caller)
  }

  async manualCheckin(dto: ManualCheckinDto, caller: Caller) {
    return this.attendance.manualCheckin(dto, caller)
  }

  async checkout(id: bigint, dto: CheckoutDto, caller: Caller) {
    return this.attendance.checkout(id, dto, caller)
  }

  async deviceAccessEvent(body: {
    memberIdentifier: string
    occurredAt: string
    deviceId: string
  }) {
    return this.deviceAccess.deviceAccessEvent(body)
  }

  async listProgress(
    memberId: bigint,
    query: { from?: string; to?: string; limit?: string },
    caller: Caller
  ) {
    const isMemberOnly = this.isMemberOnly(caller)
    const isPTOnly = this.isTrainerOnly(caller)
    const isOwnerOrStaff = this.isOwnerOrStaff(caller)

    if (isMemberOnly) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (selfMemberId !== memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Ban chi co the xem tien trinh cua minh',
        })
      }
    } else if (isPTOnly && !isOwnerOrStaff) {
      const member = await this.prisma.member.findFirst({
        where: { memberId, deletedAt: null },
        select: { primaryTrainerId: true },
      })
      const callerStaffId = await this.resolveCallerStaffId(caller)
      if (!member || member.primaryTrainerId !== callerStaffId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'PT chi co the xem tien trinh member minh phu trach',
        })
      }
    }

    const where: Prisma.MemberProgressWhereInput = { memberId, deletedAt: null }
    if (query.from)
      where.recordedAt = { ...(where.recordedAt as object), gte: new Date(query.from) }
    if (query.to) where.recordedAt = { ...(where.recordedAt as object), lte: new Date(query.to) }

    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50
    const records = await this.prisma.memberProgress.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
    return { data: records.map((p) => this.serializeProgress(p)) }
  }

  async recordProgress(memberId: bigint, dto: CreateProgressDto, caller: Caller) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: { memberId: true, primaryTrainerId: true },
    })
    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Member khong ton tai',
      })
    }

    if (this.isMemberOnly(caller)) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (selfMemberId !== memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong co quyen ghi progress cho member khac',
        })
      }
    }

    const callerStaffId = await this.resolveCallerStaffId(caller)
    if (this.isTrainerOnly(caller) && member.primaryTrainerId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'TRAINER_NOT_ASSIGNED',
        message: 'PT chi duoc ghi progress cho member co primary trainer la minh',
      })
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date()
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
    if (recordedAt > fiveMinFromNow) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'recordedAt khong duoc qua tuong lai 5 phut',
      })
    }

    if (!callerStaffId) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Tai khoan dang nhap khong gan voi Staff profile hop le',
      })
    }

    const progress = await this.prisma.memberProgress.create({
      data: {
        memberId: member.memberId,
        staffId: callerStaffId,
        weight: dto.weight !== undefined ? new Prisma.Decimal(dto.weight) : null,
        bmi: dto.bmi !== undefined ? new Prisma.Decimal(dto.bmi) : null,
        goal: dto.goal ?? null,
        notes: dto.notes ?? null,
        recordedAt,
      },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'progress.record',
      resourceType: 'member_progress',
      resourceId: progress.progressId.toString(),
      afterData: this.serializeProgress(progress) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeProgress(progress) }
  }

  async deleteProgress(id: bigint, caller: Caller) {
    const progress = await this.prisma.memberProgress.findFirst({
      where: { progressId: id, deletedAt: null },
    })
    if (!progress) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Progress record khong ton tai',
      })
    }

    const isOwnerOrStaff = this.isOwnerOrStaff(caller)
    const callerStaffId = await this.resolveCallerStaffId(caller)
    if (!isOwnerOrStaff && progress.staffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen xoa progress record nay',
      })
    }

    await this.prisma.memberProgress.update({
      where: { progressId: id },
      data: { deletedAt: new Date() },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'progress.delete',
      resourceType: 'member_progress',
      resourceId: id.toString(),
    })
  }


  private async resolveCallerStaffId(caller: Caller): Promise<bigint | null> {
    if (caller.staffId) {
      return caller.staffId
    }
    const staff = await this.prisma.staff.findFirst({
      where: { userId: caller.userId, deletedAt: null },
      select: { staffId: true },
    })
    return staff?.staffId ?? null
  }

  private async resolveCallerMemberId(caller: Caller): Promise<bigint | null> {
    if (caller.memberId) {
      return caller.memberId
    }
    const member = await this.prisma.member.findFirst({
      where: { userId: caller.userId, deletedAt: null },
      select: { memberId: true },
    })
    return member?.memberId ?? null
  }

  private isOwnerOrStaff(caller: Caller): boolean {
    return caller.roles.some((role) => role === 'owner' || role === 'staff')
  }

  private isTrainerOnly(caller: Caller): boolean {
    return caller.roles.includes('trainer') && !this.isOwnerOrStaff(caller)
  }

  private isMemberOnly(caller: Caller): boolean {
    return (
      caller.roles.includes('member') &&
      !caller.roles.includes('staff') &&
      !caller.roles.includes('trainer') &&
      !caller.roles.includes('owner')
    )
  }

  private parseBigIntField(value: string, field: string): bigint {
    try {
      return BigInt(value)
    } catch {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: `${field} khong hop le`,
      })
    }
  }

  private async resolveSessionPlanLink(
    assignmentIdValue: string | undefined,
    planDayIdValue: string | undefined,
    memberId: bigint,
    required: boolean
  ): Promise<{ assignmentId: bigint; planDayId: bigint } | null> {
    if (!assignmentIdValue && !planDayIdValue) {
      if (required) {
        throw new BadRequestException({
          success: false,
          code: 'WORKOUT_PLAN_REQUIRED',
          message: 'Trainer phai chon workout plan va ngay tap cho session',
        })
      }
      return null
    }

    if (!assignmentIdValue || !planDayIdValue) {
      throw new BadRequestException({
        success: false,
        code: 'WORKOUT_PLAN_LINK_INCOMPLETE',
        message: 'assignmentId va planDayId phai duoc gui cung nhau',
      })
    }

    const assignmentId = this.parseBigIntField(assignmentIdValue, 'assignmentId')
    const planDayId = this.parseBigIntField(planDayIdValue, 'planDayId')
    const assignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: {
        assignmentId,
        memberId,
        status: WorkoutAssignmentStatus.active,
      },
      select: {
        assignmentId: true,
        planId: true,
      },
    })

    if (!assignment) {
      throw new BadRequestException({
        success: false,
        code: 'WORKOUT_ASSIGNMENT_INVALID',
        message: 'Workout assignment khong active hoac khong thuoc member',
      })
    }

    const planDay = await this.prisma.workoutPlanDay.findFirst({
      where: {
        planDayId,
        planId: assignment.planId,
      },
      select: { planDayId: true },
    })

    if (!planDay) {
      throw new BadRequestException({
        success: false,
        code: 'WORKOUT_PLAN_DAY_INVALID',
        message: 'Ngay tap khong thuoc workout plan dang gan cho member',
      })
    }

    return { assignmentId, planDayId }
  }

  private async checkOverlap(
    roomId: bigint | null,
    trainerStaffId: bigint | null,
    startTime: Date,
    endTime: Date,
    errorCode: string,
    excludeId?: bigint
  ) {
    const where: Prisma.TrainingSessionWhereInput = {
      status: { not: TrainingSessionStatus.cancelled },
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    }
    if (roomId) where.roomId = roomId
    if (trainerStaffId) where.trainerStaffId = trainerStaffId
    if (excludeId) where.sessionId = { not: excludeId }

    const overlap = await this.prisma.trainingSession.findFirst({
      where,
      include: {
        room: { select: { name: true } },
        trainer: { select: { user: { select: { fullName: true } } } },
      },
    })
    if (overlap) {
      const fmtTime = (d: Date) =>
        d.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      const fmtDate = (d: Date) =>
        d.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      const s = fmtTime(overlap.startTime)
      const e = fmtTime(overlap.endTime)
      const day = fmtDate(overlap.startTime)

      const message =
        errorCode === 'ROOM_TIME_OVERLAP'
          ? `Phong "${overlap.room?.name ?? ''}" da co buoi tap vao ${day} luc ${s}–${e}`
          : `PT "${overlap.trainer?.user?.fullName ?? ''}" da co buoi tap vao ${day} luc ${s}–${e}`

      throw new ConflictException({
        success: false,
        code: errorCode,
        message,
      })
    }
  }

  private checkSessionAccess(
    session: { memberId: bigint; trainerStaffId: bigint },
    caller: Caller
  ) {
    if (this.isOwnerOrStaff(caller)) {
      return
    }

    if (this.isTrainerOnly(caller)) {
      if (session.trainerStaffId !== caller.staffId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong co quyen truy cap session nay',
        })
      }
      return
    }

    if (this.isMemberOnly(caller)) {
      if (session.memberId !== caller.memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong co quyen truy cap session nay',
        })
      }
      return
    }

    throw new ForbiddenException({
      success: false,
      code: 'FORBIDDEN',
      message: 'Khong co quyen truy cap session nay',
    })
  }

  private serializeSession(session: SessionRow, withAttendance = false) {
    const base = {
      sessionId: session.sessionId.toString(),
      memberId: session.memberId.toString(),
      memberName: session.member.user.fullName,
      trainerStaffId: session.trainerStaffId.toString(),
      trainerName: session.trainer.user.fullName,
      roomId: session.roomId.toString(),
      roomName: session.room.name,
      assignmentId: session.assignmentId?.toString() ?? null,
      planDayId: session.planDayId?.toString() ?? null,
      workoutPlan: session.assignment?.plan
        ? {
            planId: session.assignment.plan.planId.toString(),
            name: session.assignment.plan.name,
            description: session.assignment.plan.description,
            status: session.assignment.plan.status,
          }
        : null,
      planDay: session.planDay
        ? {
            planDayId: session.planDay.planDayId.toString(),
            planId: session.planDay.planId.toString(),
            dayNumber: session.planDay.dayNumber,
            weekNumber: session.planDay.weekNumber,
            dayOfWeek: session.planDay.dayOfWeek,
            name: session.planDay.name,
            notes: session.planDay.notes ?? null,
            exercises:
              session.planDay.exercises?.map((exercise) => ({
                planExerciseId: exercise.planExerciseId.toString(),
                planDayId: exercise.planDayId.toString(),
                exerciseId: exercise.exerciseId.toString(),
                orderIndex: exercise.orderIndex,
                targetSets: exercise.targetSets,
                targetReps: exercise.targetReps,
                targetDurationSec: exercise.targetDurationSec,
                targetWeightKg: exercise.targetWeightKg?.toString() ?? null,
                restSeconds: exercise.restSeconds,
                notes: exercise.notes,
                exercise: exercise.exercise
                  ? {
                      exerciseId: exercise.exercise.exerciseId.toString(),
                      name: exercise.exercise.name,
                      category: exercise.exercise.category,
                      muscleGroup: exercise.exercise.muscleGroup,
                      equipmentNeeded: exercise.exercise.equipmentNeeded,
                      description: exercise.exercise.description,
                      imageUrl: exercise.exercise.imageUrl,
                      createdByStaffId: exercise.exercise.createdByStaffId?.toString() ?? null,
                      createdAt: exercise.exercise.createdAt,
                      deletedAt: exercise.exercise.deletedAt,
                    }
                  : null,
              })) ?? [],
          }
        : null,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
    }

    if (!withAttendance) {
      return base
    }

    return {
      ...base,
      attendanceLogs:
        session.attendanceLogs?.map((a: AttendanceRow) => this.attendance.serializeAttendance(a)) ??
        [],
    }
  }

  private serializeProgress(progress: Prisma.MemberProgressGetPayload<object>) {
    return {
      progressId: progress.progressId.toString(),
      memberId: progress.memberId.toString(),
      staffId: progress.staffId?.toString() ?? null,
      staffName: null as string | null,
      weight: progress.weight != null ? Number(progress.weight) : null,
      height: progress.height != null ? Number(progress.height) : null,
      bmi: progress.bmi != null ? Number(progress.bmi) : null,
      goal: progress.goal,
      notes: progress.notes,
      recordedAt: progress.recordedAt,
    }
  }
}
