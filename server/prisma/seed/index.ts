import { prisma, SEED_PASSWORD } from './client'
import { seedPermissions, seedGroups } from './rbac'
import { seedUsers, seedNewUsersStaffMembers } from './users'
import { seedExercises } from './exercises'
import { seedPackages, seedNewPackages } from './packages'
import { seedRoomsAndEquipment, seedNewRoomsAndEquipment } from './rooms-equipment'
import { seedSubscriptionsAndPayments, seedNewSubscriptionsAndPayments } from './subscriptions'
import { seedStaffSchedules, seedNewStaffSchedules } from './schedules'
import { seedMemberProgress, seedTrainingSessions, seedAttendanceLogs } from './progress'
import { seedFeedback } from './feedback'
import { seedWorkoutPlansAndLogs } from './workout-plans'
import { seedPaymentAccounts } from './payment-accounts'
import { seedStaffAttendanceLogs } from './staff-attendance'

async function reset(): Promise<void> {
  await prisma.$transaction([
    prisma.workoutLogSet.deleteMany(),
    prisma.workoutLog.deleteMany(),
    prisma.workoutPlanExercise.deleteMany(),
    prisma.workoutPlanDay.deleteMany(),
    prisma.memberWorkoutPlan.deleteMany(),
    prisma.workoutPlan.deleteMany(),
    prisma.exercise.deleteMany(),
    prisma.attendanceLog.deleteMany(),
    prisma.memberProgress.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.trainingSession.deleteMany(),
    prisma.staffSchedule.deleteMany(),
    prisma.maintenanceLog.deleteMany(),
    prisma.paymentAccount.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.package.deleteMany(),
    prisma.equipment.deleteMany(),
    prisma.gymRoom.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.file.deleteMany(),
    prisma.groupPermission.deleteMany(),
    prisma.userGroup.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.group.deleteMany(),
    prisma.staffAttendanceLog.deleteMany(),
    prisma.member.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function main(): Promise<void> {
  console.log('[seed] reset RBAC + profile tables...')
  await reset()

  console.log('[seed] permissions...')
  const permissionMap = await seedPermissions()

  console.log('[seed] groups + group_permissions...')
  const groupMap = await seedGroups(permissionMap)

  console.log('[seed] users + staff + members + user_groups...')
  await seedUsers(groupMap)

  console.log('[seed] exercises...')
  await seedExercises()

  console.log('[seed] packages...')
  const packageMap = await seedPackages()

  console.log('[seed] rooms + equipment...')
  const { roomMap, equipMap } = await seedRoomsAndEquipment()

  console.log('[seed] subscriptions + payments...')
  await seedSubscriptionsAndPayments(packageMap)

  console.log('[seed] payment accounts...')
  await seedPaymentAccounts()

  console.log('[seed] staff schedules...')
  await seedStaffSchedules()

  console.log('[seed] member progress...')
  await seedMemberProgress()

  console.log('[seed] training sessions...')
  await seedTrainingSessions(roomMap)

  console.log('[seed] attendance logs...')
  await seedAttendanceLogs()

  console.log('[seed] feedback...')
  await seedFeedback(equipMap)

  console.log('[seed] workout plans + logs...')
  await seedWorkoutPlansAndLogs()

  console.log('[seed] new packages (PKG-0006..008)...')
  const newPkgMap = await seedNewPackages()

  console.log('[seed] new users / staff / members...')
  await seedNewUsersStaffMembers(groupMap)

  console.log('[seed] new rooms & equipment...')
  await seedNewRoomsAndEquipment()

  console.log('[seed] new subscriptions & payments...')
  await seedNewSubscriptionsAndPayments(new Map([...packageMap, ...newPkgMap]))

  console.log('[seed] new staff schedules...')
  await seedNewStaffSchedules()

  console.log('[seed] staff attendance logs...')
  await seedStaffAttendanceLogs()

  const counts = {
    users: await prisma.user.count(),
    staff: await prisma.staff.count(),
    members: await prisma.member.count(),
    packages: await prisma.package.count(),
    subscriptions: await prisma.subscription.count(),
    payments: await prisma.payment.count(),
    rooms: await prisma.gymRoom.count(),
    equipment: await prisma.equipment.count(),
    groups: await prisma.group.count(),
    permissions: await prisma.permission.count(),
    exercises: await prisma.exercise.count(),
    workout_plans: await prisma.workoutPlan.count(),
    attendance_logs: await prisma.attendanceLog.count(),
    feedback: await prisma.feedback.count(),
  }
  console.log('[seed] done. Row counts:', counts)
  console.log(`[seed] All seeded users share password: ${SEED_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
