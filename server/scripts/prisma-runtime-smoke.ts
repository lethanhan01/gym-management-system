import { Prisma } from '@prisma/client'
import { PrismaService } from '../src/prisma/prisma.service'

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 5_000

type CountQuery = {
  name: string
  run: () => Promise<number>
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

function isTransientConnectionError(error: unknown): boolean {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.errorCode
        : undefined

  if (code === 'P1001' || code === 'P1002') {
    return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return /P1001|P1002|Can't reach database server|timed out/i.test(message)
}

async function withConnectionRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt === MAX_ATTEMPTS) {
        throw error
      }

      // eslint-disable-next-line no-console
      console.warn(`${label}: transient database error, retrying (${attempt}/${MAX_ATTEMPTS})`)
      await sleep(RETRY_DELAY_MS)
    }
  }

  throw new Error(`${label}: retry loop ended unexpectedly`)
}

async function main(): Promise<void> {
  const prisma = new PrismaService()

  const queries: CountQuery[] = [
    { name: 'User', run: () => prisma.user.count() },
    { name: 'Member', run: () => prisma.member.count() },
    { name: 'Staff', run: () => prisma.staff.count() },
    { name: 'Group', run: () => prisma.group.count() },
    { name: 'Permission', run: () => prisma.permission.count() },
    { name: 'UserGroup', run: () => prisma.userGroup.count() },
    { name: 'GroupPermission', run: () => prisma.groupPermission.count() },
    { name: 'Package', run: () => prisma.package.count() },
    { name: 'Subscription', run: () => prisma.subscription.count() },
    { name: 'Payment', run: () => prisma.payment.count() },
    { name: 'PaymentAccount', run: () => prisma.paymentAccount.count() },
    { name: 'GymRoom', run: () => prisma.gymRoom.count() },
    { name: 'Equipment', run: () => prisma.equipment.count() },
    { name: 'MaintenanceLog', run: () => prisma.maintenanceLog.count() },
    { name: 'TrainingSession', run: () => prisma.trainingSession.count() },
    { name: 'AttendanceLog', run: () => prisma.attendanceLog.count() },
    { name: 'MemberProgress', run: () => prisma.memberProgress.count() },
    { name: 'Feedback', run: () => prisma.feedback.count() },
    { name: 'StaffSchedule', run: () => prisma.staffSchedule.count() },
    { name: 'StaffAttendanceLog', run: () => prisma.staffAttendanceLog.count() },
    { name: 'AuditLog', run: () => prisma.auditLog.count() },
    { name: 'Exercise', run: () => prisma.exercise.count() },
    { name: 'WorkoutPlan', run: () => prisma.workoutPlan.count() },
    { name: 'WorkoutPlanDay', run: () => prisma.workoutPlanDay.count() },
    { name: 'WorkoutPlanExercise', run: () => prisma.workoutPlanExercise.count() },
    { name: 'MemberWorkoutPlan', run: () => prisma.memberWorkoutPlan.count() },
    { name: 'WorkoutLog', run: () => prisma.workoutLog.count() },
    { name: 'WorkoutLogSet', run: () => prisma.workoutLogSet.count() },
    { name: 'File', run: () => prisma.file.count() },
  ]

  try {
    await withConnectionRetry('SELECT 1', () => prisma.$queryRawUnsafe('SELECT 1'))

    for (const query of queries) {
      const count = await withConnectionRetry(query.name, query.run)
      // eslint-disable-next-line no-console
      console.log(`${query.name}: ${count}`)
    }

    // eslint-disable-next-line no-console
    console.log(`Prisma runtime smoke passed (${queries.length} model delegates).`)
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})
