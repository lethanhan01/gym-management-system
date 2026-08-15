import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AttendanceMethod, TrainingSessionStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

type DeviceAccessResponse = {
  success: true
  data: {
    attendanceLogId: string
    deduped: boolean
    member: {
      memberId: string
      memberCode: string
      fullName: string
      photoUrl: string | null
    }
    subscription: {
      subscriptionId: string
      endDate: string
    }
    sessionId: string | null
  }
}

type DeviceAccessEntry = {
  expiresAt: number
  promise: Promise<DeviceAccessResponse>
}

const deviceAccessDedupe = new Map<string, DeviceAccessEntry>()

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class DeviceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  async deviceAccessEvent(body: {
    memberIdentifier: string
    occurredAt: string
    deviceId: string
  }): Promise<DeviceAccessResponse> {
    this.cleanupDeviceDedupe()
    const key = `${body.deviceId}:${body.occurredAt}`
    const existing = deviceAccessDedupe.get(key)
    if (existing && existing.expiresAt > Date.now()) {
      const response = await existing.promise
      return { ...response, data: { ...response.data, deduped: true } }
    }

    const promise = this.processDeviceAccessEvent(body)
    deviceAccessDedupe.set(key, { expiresAt: Date.now() + 60_000, promise })

    try {
      const response = await promise
      deviceAccessDedupe.set(key, {
        expiresAt: Date.now() + 60_000,
        promise: Promise.resolve(response),
      })
      return response
    } catch (error) {
      deviceAccessDedupe.delete(key)
      throw error
    }
  }

  private async processDeviceAccessEvent(body: {
    memberIdentifier: string
    occurredAt: string
    deviceId: string
  }): Promise<DeviceAccessResponse> {
    const occurredAt = new Date(body.occurredAt)

    const member = await this.prisma.member.findFirst({
      where: { memberCode: body.memberIdentifier, deletedAt: null },
      include: { user: { select: { fullName: true, avatarFileId: true } } },
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

    const existingOpen = await this.prisma.attendanceLog.findFirst({
      where: { memberId: member.memberId, endTime: null },
    })
    if (existingOpen) {
      await this.prisma.attendanceLog.update({
        where: { attendanceId: existingOpen.attendanceId },
        data: { endTime: occurredAt },
      })
    }

    const session = await this.prisma.trainingSession.findFirst({
      where: {
        memberId: member.memberId,
        status: { in: [TrainingSessionStatus.scheduled, TrainingSessionStatus.in_progress] },
        startTime: { lte: occurredAt },
        endTime: { gte: occurredAt },
        deletedAt: null,
      },
    })

    if (session) {
      await this.prisma.trainingSession.update({
        where: { sessionId: session.sessionId },
        data: { status: TrainingSessionStatus.in_progress },
      })
    }

    const attendance = await this.prisma.attendanceLog.create({
      data: {
        memberId: member.memberId,
        subscriptionId: sub.subscriptionId,
        sessionId: session?.sessionId ?? null,
        startTime: occurredAt,
        method: AttendanceMethod.realtime,
      },
    })

    const response: DeviceAccessResponse = {
      success: true,
      data: {
        attendanceLogId: attendance.attendanceId.toString(),
        deduped: false,
        member: {
          memberId: member.memberId.toString(),
          memberCode: member.memberCode,
          fullName: member.user.fullName,
          photoUrl: null,
        },
        subscription: {
          subscriptionId: sub.subscriptionId.toString(),
          endDate: sub.endDate.toISOString().slice(0, 10),
        },
        sessionId: session?.sessionId.toString() ?? null,
      },
    }

    await this.audit.log({
      actorUserId: null,
      action: 'attendance.realtime-checkin',
      resourceType: 'attendance_log',
      resourceId: attendance.attendanceId.toString(),
    })

    await this.notifyDeviceCheckin(
      attendance.attendanceId,
      member.userId,
      member.primaryTrainerId,
      member.user.fullName
    )

    return response
  }

  private cleanupDeviceDedupe() {
    const now = Date.now()
    for (const [key, entry] of deviceAccessDedupe.entries()) {
      if (entry.expiresAt <= now) {
        deviceAccessDedupe.delete(key)
      }
    }
  }

  private async notifyDeviceCheckin(
    attendanceId: bigint,
    memberUserId: bigint,
    primaryTrainerId: bigint | null,
    memberName: string
  ) {
    const payload = {
      type: 'attendance.checkin',
      title: 'Check-in thanh cong',
      message: 'Ban da check-in thanh cong.',
      resourceType: 'attendance_log',
      resourceId: attendanceId.toString(),
      dedupeKey: `attendance:${attendanceId.toString()}:checkin`,
    }
    await this.notifications.safeNotifyUser(memberUserId, payload)

    if (!primaryTrainerId) return
    const trainer = await this.prisma.staff.findFirst({
      where: { staffId: primaryTrainerId, deletedAt: null },
      select: { userId: true },
    })
    await this.notifications.safeNotifyUser(trainer?.userId, {
      ...payload,
      message: `Hoc vien ${memberName} vua check-in.`,
      metadata: { memberName },
    })
  }
}
