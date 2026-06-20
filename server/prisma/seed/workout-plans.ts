import { PlanCreatorType, WorkoutPlanStatus, WorkoutAssignmentStatus } from '@prisma/client'
import { prisma } from './client'

type PlanExercise = {
  name: string
  sets: number
  reps?: number
  durationSec?: number
  weightKg?: number
  restSec: number
  notes: string
}

type PlanDay = {
  weekNumber: number
  dayOfWeek: number
  dayNumber: number
  name: string
  notes: string
  exercises: PlanExercise[]
}

const upperDay = (weekNumber: number, dayNumber: number, sets: number, reps: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 1,
  dayNumber,
  name: 'Than tren - Day va on dinh vai',
  notes: 'Khoi dong vai 8 phut; dung set khi ky thuat bat dau giam.',
  exercises: [
    {
      name: 'Bench Press',
      sets,
      reps,
      weightKg: 35 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Giu ba vai co dinh tren ghe.',
    },
    {
      name: 'Overhead Press',
      sets: 3,
      reps: Math.max(6, reps - 2),
      weightKg: 20 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Siet core, khong uon lung.',
    },
    {
      name: 'Push-up',
      sets: 3,
      reps: reps + 4,
      restSec: 60,
      notes: 'Giu than nguoi thanh mot duong thang.',
    },
    {
      name: 'Plank',
      sets: 3,
      durationSec: 30 + weekNumber * 10,
      restSec: 45,
      notes: 'Tho deu va siet mong.',
    },
  ],
})

const lowerDay = (weekNumber: number, dayNumber: number, sets: number, reps: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 3,
  dayNumber,
  name: 'Than duoi - Suc manh va kiem soat',
  notes: 'Khoi dong hong, goi va co chan truoc khi vao set chinh.',
  exercises: [
    {
      name: 'Squat',
      sets,
      reps,
      weightKg: 40 + weekNumber * 5,
      restSec: 120,
      notes: 'Goi theo huong mui chan.',
    },
    {
      name: 'Deadlift',
      sets: 3,
      reps: Math.max(6, reps - 2),
      weightKg: 50 + weekNumber * 5,
      restSec: 120,
      notes: 'Giu thanh ta sat chan.',
    },
    {
      name: 'Lunge',
      sets: 3,
      reps,
      restSec: 60,
      notes: 'So rep tinh cho moi ben.',
    },
    {
      name: 'Dead Bug',
      sets: 3,
      reps: 10,
      restSec: 45,
      notes: 'Giu lung duoi on dinh.',
    },
    {
      name: 'Hamstring Stretch',
      sets: 2,
      durationSec: 40,
      restSec: 20,
      notes: 'Giu moi ben 40 giay.',
    },
  ],
})

const conditioningDay = (weekNumber: number, dayNumber: number, cardioSec: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 5,
  dayNumber,
  name: 'Lung, core va tim mach',
  notes: 'Duy tri nhip vua; uu tien ky thuat hon toc do.',
  exercises: [
    {
      name: 'Barbell Row',
      sets: 3,
      reps: 10,
      weightKg: 30 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Keo khuyu ve sau, khong giat lung.',
    },
    {
      name: 'Pull-up',
      sets: 3,
      reps: 6 + weekNumber,
      restSec: 120,
      notes: 'Dung day ho tro neu can.',
    },
    {
      name: 'Bird Dog',
      sets: 3,
      reps: 10,
      restSec: 45,
      notes: 'So rep tinh cho moi ben.',
    },
    {
      name: 'Treadmill Run',
      sets: 1,
      durationSec: cardioSec,
      restSec: 0,
      notes: 'Giu vung nhip tim 65-75% toi da.',
    },
    {
      name: 'Hip Flexor Stretch',
      sets: 2,
      durationSec: 40,
      restSec: 20,
      notes: 'Giu moi ben 40 giay.',
    },
  ],
})

const TRAINER_MINH_FOUR_WEEK_PLAN: PlanDay[] = [
  upperDay(1, 1, 3, 10),
  lowerDay(1, 2, 3, 10),
  conditioningDay(1, 3, 720),
  upperDay(2, 4, 4, 10),
  lowerDay(2, 5, 4, 10),
  conditioningDay(2, 6, 900),
  upperDay(3, 7, 4, 8),
  lowerDay(3, 8, 4, 8),
  conditioningDay(3, 9, 1080),
  upperDay(4, 10, 3, 8),
  lowerDay(4, 11, 3, 8),
  conditioningDay(4, 12, 720),
]

export async function seedWorkoutPlansAndLogs(): Promise<void> {
  const [staffMinh, memberA, showcaseMember] = await Promise.all([
    prisma.staff.findUnique({ where: { staffCode: 'STF-PT-001' }, select: { staffId: true } }),
    prisma.member.findUnique({ where: { memberCode: 'MB-2026-0001' }, select: { memberId: true } }),
    prisma.member.findUnique({ where: { memberCode: 'MB-2026-0007' }, select: { memberId: true } }),
  ])
  if (!staffMinh || !memberA || !showcaseMember) return

  await prisma.workoutLogSet.deleteMany({})
  await prisma.workoutLog.deleteMany({})
  await prisma.memberWorkoutPlan.deleteMany({})
  await prisma.workoutPlan.deleteMany({ where: { creatorStaffId: staffMinh.staffId } })

  const exercises = await prisma.exercise.findMany({
    where: {
      name: {
        in: [
          ...new Set(
            TRAINER_MINH_FOUR_WEEK_PLAN.flatMap((day) => day.exercises.map((e) => e.name))
          ),
        ],
      },
    },
    select: { exerciseId: true, name: true },
  })
  const exMap = new Map(exercises.map((e) => [e.name, e.exerciseId]))

  const plan = await prisma.workoutPlan.create({
    data: {
      creatorStaffId: staffMinh.staffId,
      creatorType: PlanCreatorType.staff,
      name: 'Chuong Trinh Suc Manh Nen Tang 4 Tuan',
      description:
        'Giao an 4 tuan, 3 buoi moi tuan, day du set, rep, thoi gian tap va thoi gian nghi.',
      status: WorkoutPlanStatus.active,
    },
  })

  const createdDays = []
  for (const dayDef of TRAINER_MINH_FOUR_WEEK_PLAN) {
    const day = await prisma.workoutPlanDay.create({
      data: {
        planId: plan.planId,
        weekNumber: dayDef.weekNumber,
        dayOfWeek: dayDef.dayOfWeek,
        dayNumber: dayDef.dayNumber,
        name: dayDef.name,
        notes: dayDef.notes,
      },
    })
    createdDays.push(day)

    await prisma.workoutPlanExercise.createMany({
      data: dayDef.exercises.map((ex, i) => ({
        planDayId: day.planDayId,
        exerciseId: exMap.get(ex.name)!,
        orderIndex: i + 1,
        targetSets: ex.sets,
        targetReps: ex.reps ?? null,
        targetDurationSec: ex.durationSec ?? null,
        targetWeightKg: ex.weightKg ?? null,
        restSeconds: ex.restSec,
        notes: ex.notes,
      })),
    })
  }
  const day1 = createdDays[0]

  const assignment = await prisma.memberWorkoutPlan.create({
    data: {
      memberId: memberA.memberId,
      planId: plan.planId,
      assignedByStaffId: staffMinh.staffId,
      startDate: new Date('2026-03-15'),
      status: WorkoutAssignmentStatus.active,
      notes: 'Tap 3 buoi/tuan (Mon-Wed-Fri). Nghi it nhat 1 ngay giua cac buoi.',
    },
  })

  await prisma.memberWorkoutPlan.create({
    data: {
      memberId: showcaseMember.memberId,
      planId: plan.planId,
      assignedByStaffId: staffMinh.staffId,
      startDate: new Date('2026-05-01'),
      status: WorkoutAssignmentStatus.active,
      notes: 'Mock assignment cho man hinh chi tiet hoc vien cua Trainer Minh.',
    },
  })

  const day1Exercises = await prisma.workoutPlanExercise.findMany({
    where: { planDayId: day1.planDayId },
    select: { planExerciseId: true, orderIndex: true },
    orderBy: { orderIndex: 'asc' },
  })

  const log = await prisma.workoutLog.create({
    data: {
      memberId: memberA.memberId,
      assignmentId: assignment.assignmentId,
      planDayId: day1.planDayId,
      loggedAt: new Date('2026-05-26T07:30:00'),
      durationMin: 50,
      notes: 'Cam giac tot, tang trong luong bench press so voi buoi truoc.',
    },
  })

  const [benchEx, , pushupEx] = day1Exercises
  await prisma.workoutLogSet.createMany({
    data: [
      // Bench Press
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 1,
        actualReps: 10,
        actualWeightKg: 40,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 2,
        actualReps: 10,
        actualWeightKg: 42.5,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 3,
        actualReps: 9,
        actualWeightKg: 42.5,
        completed: true,
      },
      // Push-up
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 1,
        actualReps: 15,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 2,
        actualReps: 15,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 3,
        actualReps: 12,
        completed: true,
      },
    ],
  })

  const mockMembers = await prisma.member.findMany({
    where: { memberCode: { in: ['MB-2026-0008', 'MB-2026-0009', 'MB-2026-0010'] } },
    select: { memberId: true, memberCode: true },
  })
  const mockLoggedAts: Record<string, Date> = {
    'MB-2026-0008': new Date('2026-05-20T08:00:00'),
    'MB-2026-0009': new Date('2026-05-22T08:00:00'),
    'MB-2026-0010': new Date('2026-05-24T08:00:00'),
  }
  const firstEx = day1Exercises[0]
  for (const mm of mockMembers) {
    const mockAssignment = await prisma.memberWorkoutPlan.create({
      data: {
        memberId: mm.memberId,
        planId: plan.planId,
        assignedByStaffId: staffMinh.staffId,
        startDate: new Date('2026-05-01'),
        status: WorkoutAssignmentStatus.active,
      },
    })
    const mockLog = await prisma.workoutLog.create({
      data: {
        memberId: mm.memberId,
        assignmentId: mockAssignment.assignmentId,
        planDayId: day1.planDayId,
        loggedAt: mockLoggedAts[mm.memberCode!],
        durationMin: 50,
      },
    })
    await prisma.workoutLogSet.createMany({
      data: [
        {
          logId: mockLog.logId,
          planExerciseId: firstEx.planExerciseId,
          setNumber: 1,
          actualReps: 10,
          actualWeightKg: 40,
          completed: true,
        },
        {
          logId: mockLog.logId,
          planExerciseId: firstEx.planExerciseId,
          setNumber: 2,
          actualReps: 9,
          actualWeightKg: 40,
          completed: true,
        },
      ],
    })
  }

  console.log('[seed] seeded 1 workout plan (4 weeks, 12 days) + 5 assignments + 4 logs + 12 sets')
}
