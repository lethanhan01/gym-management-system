import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AttendanceMethod, Prisma } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CheckoutDto } from './dto/checkout.dto'
import { ListAttendanceLogsDto } from './dto/list-attendance.dto'
import { ManualCheckinDto } from './dto/manual-checkin.dto'

type Caller = {
  userId: bigint
  roles: string[]
  staffId?: bigint
  memberId?: bigint
}

export interface AttendanceRow {
  attendanceId: bigint
  memberId: bigint
  member: { memberCode: string; user: { fullName: string } }
  subscriptionId: bigint
  sessionId?: bigint | null
  startTime: Date
  endTime: Date | null
  method: string
}

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listAttendance(dto: ListAttendanceLogsDto, caller: Caller) {
    const { page = 1, pageSize = 20, memberId, subscriptionId, sessionId, method, from, to } = dto
    const where: Prisma.AttendanceLogWhereInput = {}

    const isMemberOnly = this.isMemberOnly(caller)
    const isPTOnly = this.isTrainerOnly(caller)
    const isOwnerOrStaff = this.isOwnerOrStaff(caller)
    const callerStaffId = await this.resolveCallerStaffId(caller)

    if (isMemberOnly) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (!selfMemberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong tim thay member profile',
        })
      }
      where.memberId = selfMemberId
    } else if (isPTOnly && !isOwnerOrStaff) {
      if (!callerStaffId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong tim thay staff profile',
        })
      }
      where.member = { primaryTrainerId: callerStaffId }
    } else {
      if (memberId) where.memberId = BigInt(memberId)
    }

    if (subscriptionId) where.subscriptionId = BigInt(subscriptionId)
    if (sessionId) where.sessionId = BigInt(sessionId)
    if (method) where.method = method as AttendanceMethod
    if (from) where.startTime = { ...(where.startTime as object), gte: new Date(from) }
    if (to) where.startTime = { ...(where.startTime as object), lte: new Date(to) }

    const [data, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: {
          member: {
            select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
          },
          subscription: { select: { subscriptionId: true, startDate: true, endDate: true } },
          session: { select: { sessionId: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.attendanceLog.count({ where }),
    ])

    return {
      data: data.map((a) => this.serializeAttendance(a)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async manualCheckin(dto: ManualCheckinDto, caller: Caller) {
    const occurredAt = new Date(dto.occurredAt)

    const member = await this.prisma.member.findFirst({
      where: { memberCode: dto.memberCode, deletedAt: null },
      include: { user: { select: { fullName: true } } },
    })
    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'MEMBER_NOT_FOUND',
        message: 'Khong tim thay member',
      })
    }

    const today = todayVN()
    const sub = await this.prisma.subscription.findFirst({
      where: {
        memberId: member.memberId,
        status: 'active',
        deletedAt: null,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })
    if (!sub) {
      throw new ForbiddenException({
        success: false,
        code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION',
        message: 'Member khong co subscription active',
      })
    }

    const openAttendance = await this.prisma.attendanceLog.findFirst({
      where: { memberId: member.memberId, endTime: null },
    })
    if (openAttendance) {
      await this.prisma.attendanceLog.update({
        where: { attendanceId: openAttendance.attendanceId },
        data: { endTime: occurredAt },
      })
    }

    const attendance = await this.prisma.attendanceLog.create({
      data: {
        memberId: member.memberId,
        subscriptionId: sub.subscriptionId,
        startTime: occurredAt,
        method: AttendanceMethod.manual,
      },
      include: {
        member: {
          select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
        },
        subscription: { select: { subscriptionId: true, endDate: true } },
      },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'attendance.manual-checkin',
      resourceType: 'attendance_log',
      resourceId: attendance.attendanceId.toString(),
    })

    return { data: this.serializeAttendance(attendance) }
  }

  async checkout(id: bigint, dto: CheckoutDto, caller: Caller) {
    const attendance = await this.prisma.attendanceLog.findFirst({
      where: { attendanceId: id },
    })
    if (!attendance) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Attendance log khong ton tai',
      })
    }
    if (attendance.endTime) {
      throw new ConflictException({
        success: false,
        code: 'ATTENDANCE_ALREADY_CLOSED',
        message: 'Attendance da checkout',
      })
    }

    const endedAt = new Date(dto.endedAt)
    if (endedAt <= attendance.startTime) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'endedAt phai lon hon startTime',
      })
    }

    const updated = await this.prisma.attendanceLog.update({
      where: { attendanceId: id },
      data: { endTime: endedAt },
      include: {
        member: {
          select: { memberId: true, memberCode: true, user: { select: { fullName: true } } },
        },
        subscription: { select: { subscriptionId: true, endDate: true } },
        session: { select: { sessionId: true, startTime: true, endTime: true } },
      },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'attendance.checkout',
      resourceType: 'attendance_log',
      resourceId: id.toString(),
      beforeData: { endTime: null },
      afterData: { endTime: endedAt },
    })

    return { data: this.serializeAttendance(updated) }
  }

  serializeAttendance(attendance: AttendanceRow) {
    return {
      attendanceId: attendance.attendanceId.toString(),
      memberId: attendance.memberId.toString(),
      memberCode: attendance.member.memberCode,
      memberName: attendance.member.user.fullName,
      subscriptionId: attendance.subscriptionId.toString(),
      sessionId: attendance.sessionId?.toString() ?? null,
      startTime: attendance.startTime,
      endTime: attendance.endTime,
      method: attendance.method,
    }
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
}
