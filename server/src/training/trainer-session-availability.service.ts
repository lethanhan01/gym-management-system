import { Injectable, NotFoundException } from '@nestjs/common'
import { TrainingSessionStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface SlotData {
  slotIndex: number
  startTime: string
  endTime: string
  available: boolean
  reason?: 'PAST_TIME' | 'TRAINER_BUSY' | 'MEMBER_BUSY'
}

@Injectable()
export class TrainerSessionAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get slot availability for a given date, trainer, and optionally a member.
   * Used by both member-booking and trainer-creating flows.
   */
  async getAvailabilitySlots(
    date: string,
    trainerStaffId: bigint,
    memberId?: bigint,
  ): Promise<{
    date: string
    trainer: { staffId: string; fullName: string; avatarFileId: string | null }
    slots: SlotData[]
  }> {
    const trainer = await this.prisma.staff.findFirst({
      where: { staffId: trainerStaffId, deletedAt: null },
      select: {
        staffId: true,
        user: { select: { fullName: true, avatarFileId: true } },
      },
    })
    if (!trainer) {
      throw new NotFoundException({
        success: false,
        code: 'TRAINER_NOT_FOUND',
        message: 'Trainer khong ton tai',
      })
    }

    // Parse date to UTC range (with VN timezone offset = UTC-7)
    const [yStr, mStr, dStr] = date.split('-')
    const year = parseInt(yStr, 10)
    const month = parseInt(mStr, 10) - 1
    const day = parseInt(dStr, 10)

    const dayStart = new Date(Date.UTC(year, month, day, 0 - 7, 0, 0, 0))
    const dayEnd = new Date(Date.UTC(year, month, day, 24 - 7, 0, 0, 0))

    // Fetch existing sessions for trainer (and optionally member) concurrently
    const trainerSessionsPromise = this.prisma.trainingSession.findMany({
      where: {
        trainerStaffId,
        status: { not: TrainingSessionStatus.cancelled },
        deletedAt: null,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    })

    const memberSessionsPromise: Promise<{ startTime: Date; endTime: Date }[]> = memberId
      ? this.prisma.trainingSession.findMany({
          where: {
            memberId,
            status: { not: TrainingSessionStatus.cancelled },
            deletedAt: null,
            startTime: { lt: dayEnd },
            endTime: { gt: dayStart },
          },
          select: { startTime: true, endTime: true },
        })
      : Promise.resolve([])

    const [trainerSessions, memberSessions] = await Promise.all([
      trainerSessionsPromise,
      memberSessionsPromise,
    ])

    // Build 15 slots from 06:00 to 21:00 (Vietnam time)
    const now = new Date()
    const graceThreshold = new Date(now.getTime() + 5 * 60 * 1000)

    const slots: SlotData[] = []
    for (let hour = 6; hour < 21; hour++) {
      const slotIndex = hour - 5
      const slotStart = new Date(Date.UTC(year, month, day, hour - 7, 0, 0, 0))
      const slotEnd = new Date(Date.UTC(year, month, day, hour + 1 - 7, 0, 0, 0))

      let available = true
      let reason: SlotData['reason']

      if (slotStart <= graceThreshold) {
        available = false
        reason = 'PAST_TIME'
      } else if (trainerSessions.some(s => s.startTime < slotEnd && s.endTime > slotStart)) {
        available = false
        reason = 'TRAINER_BUSY'
      } else if (memberSessions.some(s => s.startTime < slotEnd && s.endTime > slotStart)) {
        available = false
        reason = 'MEMBER_BUSY'
      }

      slots.push({
        slotIndex,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        available,
        ...(reason ? { reason } : {}),
      })
    }

    return {
      date,
      trainer: {
        staffId: trainer.staffId.toString(),
        fullName: trainer.user.fullName,
        avatarFileId: trainer.user.avatarFileId?.toString() ?? null,
      },
      slots,
    }
  }
}
