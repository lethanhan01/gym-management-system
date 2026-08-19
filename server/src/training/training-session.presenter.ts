import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AttendanceRow, AttendanceService } from './attendance.service'
import { SessionRow } from './training.types'

export const SESSION_PLAN_SELECT = {
  planId: true,
  name: true,
  description: true,
  status: true,
} satisfies Prisma.WorkoutPlanSelect

export const SESSION_PLAN_DAY_SELECT = {
  planDayId: true,
  planId: true,
  dayNumber: true,
  weekNumber: true,
  dayOfWeek: true,
  name: true,
  notes: true,
} satisfies Prisma.WorkoutPlanDaySelect

export const SESSION_SUMMARY_INCLUDE = {
  member: { select: { memberId: true, userId: true, user: { select: { fullName: true } } } },
  trainer: { select: { staffId: true, userId: true, user: { select: { fullName: true } } } },
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

export const SESSION_DETAIL_INCLUDE = {
  ...SESSION_SUMMARY_INCLUDE,
  planDay: {
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: { exercise: { include: { bodyPart: true, targetMuscle: true, equipment: true } } },
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
export class TrainingSessionPresenter {
  constructor(private readonly attendance: AttendanceService) {}
  serializeSession(session: SessionRow, withAttendance = false) {
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
                      bodyPart: exercise.exercise.bodyPart
                        ? { name: exercise.exercise.bodyPart.name }
                        : null,
                      targetMuscle: exercise.exercise.targetMuscle
                        ? { name: exercise.exercise.targetMuscle.name }
                        : null,
                      equipment: exercise.exercise.equipment
                        ? { name: exercise.exercise.equipment.name }
                        : null,
                      description: exercise.exercise.description,
                      gifUrl: exercise.exercise.gifUrl,
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
}
