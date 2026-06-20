import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto'
import { UpdateWorkoutLogDto } from './dto/update-workout-log.dto'

@Injectable()
export class WorkoutLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateWorkoutLogDto, user: AuthenticatedUser) {
    const member = await this.resolveCallerMember(user)
    if (!member) {
      throw new ForbiddenException('Khong tim thay member profile')
    }

    const assignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: {
        assignmentId: BigInt(dto.assignmentId),
        memberId: member.memberId,
      },
      include: {
        plan: true,
      },
    })

    if (!assignment) {
      throw new ForbiddenException('Assignment khong thuoc member nay')
    }
    if (assignment.status !== 'active') {
      throw new BadRequestException('Assignment khong active')
    }

    const planDay = await this.prisma.workoutPlanDay.findFirst({
      where: {
        planDayId: BigInt(dto.planDayId),
        planId: assignment.planId,
      },
      include: { plan: true },
    })
    if (!planDay) {
      throw new BadRequestException('planDayId khong thuoc plan cua assignment')
    }

    const planExerciseIds = [...new Set(dto.sets.map((set) => BigInt(set.planExerciseId)))]
    if (planExerciseIds.length > 0) {
      const planExercises = await this.prisma.workoutPlanExercise.findMany({
        where: {
          planExerciseId: { in: planExerciseIds },
          planDayId: BigInt(dto.planDayId),
        },
        select: {
          planExerciseId: true,
          targetSets: true,
          targetReps: true,
          targetWeightKg: true,
          targetDurationSec: true,
          exercise: {
            select: { exerciseId: true, name: true },
          },
        },
      })

      if (planExercises.length !== planExerciseIds.length) {
        throw new BadRequestException('planExerciseId khong thuoc planDay')
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const log = await tx.workoutLog.create({
        data: {
          memberId: member.memberId,
          assignmentId: BigInt(dto.assignmentId),
          planDayId: BigInt(dto.planDayId),
          loggedAt: new Date(dto.loggedAt),
          durationMin: dto.durationMin ?? null,
          notes: dto.notes ?? null,
        },
      })

      if (dto.sets.length > 0) {
        await tx.workoutLogSet.createMany({
          data: dto.sets.map((set) => ({
            logId: log.logId,
            planExerciseId: BigInt(set.planExerciseId),
            setNumber: set.setNumber,
            actualReps: set.actualReps ?? null,
            actualWeightKg: set.actualWeightKg ?? null,
            actualDurationSec: set.actualDurationSec ?? null,
            completed: set.completed ?? true,
          })),
        })
      }

      return tx.workoutLog.findUnique({
        where: { logId: log.logId },
        include: {
          planDay: true,
          sets: {
            include: {
              planExercise: {
                include: { exercise: true },
              },
            },
            orderBy: { setNumber: 'asc' },
          },
        },
      })
    })

    if (!result) {
      throw new NotFoundException('Workout log khong ton tai')
    }

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_log.create',
      resourceType: 'workout_log',
      resourceId: result.logId.toString(),
      afterData: {
        logId: result.logId.toString(),
        assignmentId: assignment.assignmentId.toString(),
        planDayId: planDay.planDayId.toString(),
        setCount: dto.sets.length,
      },
    })

    return result
  }

  async findAll(user: AuthenticatedUser) {
    const member = await this.resolveCallerMember(user)
    if (!member) {
      throw new ForbiddenException('Khong tim thay member profile')
    }

    return this.prisma.workoutLog.findMany({
      where: { memberId: member.memberId },
      include: {
        planDay: true,
        sets: {
          include: { planExercise: { include: { exercise: true } } },
          orderBy: { setNumber: 'asc' },
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 50,
    })
  }

  async update(id: bigint, dto: UpdateWorkoutLogDto, user: AuthenticatedUser) {
    const member = await this.resolveCallerMember(user)
    if (!member) {
      throw new ForbiddenException('Khong tim thay member profile')
    }

    const log = await this.prisma.workoutLog.findUnique({ where: { logId: id } })
    if (!log) {
      throw new NotFoundException('Workout log khong ton tai')
    }
    if (log.memberId !== member.memberId) {
      throw new ForbiddenException('Khong co quyen sua workout log nay')
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    if (log.loggedAt < cutoff) {
      throw new ForbiddenException('Chi duoc sua workout log trong vong 24 gio')
    }

    const updated = await this.prisma.workoutLog.update({
      where: { logId: id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin ?? null } : {}),
      },
      include: {
        planDay: true,
        sets: {
          include: { planExercise: { include: { exercise: true } } },
          orderBy: { setNumber: 'asc' },
        },
      },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_log.update',
      resourceType: 'workout_log',
      resourceId: id.toString(),
      beforeData: {
        logId: id.toString(),
        changedFields: Object.keys(dto),
      },
      afterData: {
        logId: id.toString(),
        changedFields: Object.keys(dto),
      },
    })

    return updated
  }

  private async resolveCallerMember(user: AuthenticatedUser) {
    if (user.memberId) {
      return { memberId: user.memberId }
    }

    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, deletedAt: null },
      select: { memberId: true },
    })
    return member ?? null
  }
}
