import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { Prisma, TrainingSessionStatus, WorkoutAssignmentStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
@Injectable()
export class TrainingSessionSchedulingService {
  constructor(private readonly prisma: PrismaService) {}
  async findAvailableRoom(
    startTime: Date,
    endTime: Date,
    tx?: Prisma.TransactionClient
  ): Promise<{ roomId: bigint; name: string } | null> {
    const client = tx ?? this.prisma
    const allRooms = await client.gymRoom.findMany({
      select: { roomId: true, name: true },
      orderBy: { roomId: 'asc' },
    })
    if (allRooms.length === 0) return null

    const busySessions = await client.trainingSession.findMany({
      where: {
        status: { not: TrainingSessionStatus.cancelled },
        deletedAt: null,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { roomId: true },
    })

    const busyRoomIds = new Set(busySessions.map((s) => s.roomId))
    const available = allRooms.find((r) => !busyRoomIds.has(r.roomId))
    return available ?? null
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
  async resolveSessionPlanLink(
    assignmentIdValue: string | undefined,
    planDayIdValue: string | undefined,
    memberId: bigint,
    required: boolean,
    tx?: Prisma.TransactionClient
  ): Promise<{ assignmentId: bigint; planDayId: bigint } | null> {
    const client = tx ?? this.prisma
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
    const assignment = await client.memberWorkoutPlan.findFirst({
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

    const planDay = await client.workoutPlanDay.findFirst({
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
  async checkOverlap(
    roomId: bigint | null,
    trainerStaffId: bigint | null,
    startTime: Date,
    endTime: Date,
    errorCode: string,
    excludeId?: bigint,
    memberId?: bigint,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma
    const where: Prisma.TrainingSessionWhereInput = {
      status: { not: TrainingSessionStatus.cancelled },
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    }
    if (roomId) where.roomId = roomId
    if (trainerStaffId) where.trainerStaffId = trainerStaffId
    if (memberId) where.memberId = memberId
    if (excludeId) where.sessionId = { not: excludeId }

    const overlap = await client.trainingSession.findFirst({
      where,
      include: {
        room: { select: { name: true } },
        trainer: { select: { user: { select: { fullName: true } } } },
        member: { select: { user: { select: { fullName: true } } } },
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

      let message = `PT "${overlap.trainer?.user?.fullName ?? ''}" da co buoi tap vao ${day} luc ${s}–${e}`
      if (errorCode === 'ROOM_TIME_OVERLAP') {
        message = `Phong "${overlap.room?.name ?? ''}" da co buoi tap vao ${day} luc ${s}–${e}`
      } else if (errorCode === 'MEMBER_TIME_OVERLAP') {
        message = `Ban da co buoi tap khac vao ${day} luc ${s}–${e}`
      }

      throw new ConflictException({
        success: false,
        code: errorCode,
        message,
      })
    }
  }
}
