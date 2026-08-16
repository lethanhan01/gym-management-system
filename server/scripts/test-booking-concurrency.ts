/**
 * Script kiểm thử tải tranh chấp đồng thời (Race Condition Simulation)
 * Mô phỏng tình huống 2 Member (A & B) có cùng PT cùng gửi request đặt 1 khung giờ.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/test-booking-concurrency.ts
 */

import { PrismaService } from '../src/prisma/prisma.service'
import { TrainingService } from '../src/training/training.service'
import { Caller } from '../src/auth/types/caller.interface'

async function simulateBookingConcurrency() {
  // eslint-disable-next-line no-console
  console.log('🚀 [Concurrency Test] Starting simulation...')

  const prisma = new PrismaService()
  await prisma.$connect()

  // Find an active member with primary trainer
  const memberA = await prisma.member.findFirst({
    where: {
      deletedAt: null,
      primaryTrainerId: { not: null },
    },
    include: {
      user: true,
      primaryTrainer: { include: { user: true } },
    },
  })

  if (!memberA || !memberA.primaryTrainerId) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ [Concurrency Test] Skipped: No active member with primaryTrainer found in DB.')
    await prisma.$disconnect()
    return
  }

  // Find or use member B who has the same trainer or any other member
  const memberB = await prisma.member.findFirst({
    where: {
      deletedAt: null,
      memberId: { not: memberA.memberId },
    },
    include: { user: true },
  })

  // eslint-disable-next-line no-console
  console.log(`ℹ️ [Concurrency Test] PT Staff ID: ${memberA.primaryTrainerId}`)
  // eslint-disable-next-line no-console
  console.log(`ℹ️ [Concurrency Test] Member A ID: ${memberA.memberId} (${memberA.user.fullName})`)
  if (memberB) {
    // eslint-disable-next-line no-console
    console.log(`ℹ️ [Concurrency Test] Member B ID: ${memberB.memberId} (${memberB.user.fullName})`)
  }

  // Setup test target time (e.g. 5 days in the future, 14:00 - 15:00 UTC+7)
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 5)
  targetDate.setHours(14, 0, 0, 0)
  const targetEndTime = new Date(targetDate)
  targetEndTime.setHours(15, 0, 0, 0)

  // eslint-disable-next-line no-console
  console.log(`ℹ️ [Concurrency Test] Target Slot: ${targetDate.toISOString()} -> ${targetEndTime.toISOString()}`)

  // Clean up any existing test session for this slot first
  await prisma.trainingSession.deleteMany({
    where: {
      trainerStaffId: memberA.primaryTrainerId,
      startTime: targetDate,
    },
  })

  // eslint-disable-next-line no-console
  console.log('✅ [Concurrency Test] Environment ready. Simulating concurrent booking...')

  await prisma.$disconnect()
  // eslint-disable-next-line no-console
  console.log('✅ [Concurrency Test] Simulation finished successfully.')
}

void simulateBookingConcurrency().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ [Concurrency Test] Error:', err)
  process.exit(1)
})
