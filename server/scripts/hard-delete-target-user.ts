import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const targetEmail = 'line_U5fa68e68f0c6691209aed5c21c8646bb@line.local'
  const targetLineId = 'U5fa68e68f0c6691209aed5c21c8646bb'

  console.log(`🔍 Seeking users with email="${targetEmail}" or lineId="${targetLineId}"...`)

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: targetEmail },
        { emailNormalized: targetEmail.toLowerCase() },
        { lineId: targetLineId },
      ],
    },
    include: {
      member: true,
      staff: true,
    },
  })

  if (users.length === 0) {
    console.log(`ℹ️ No user found matching ${targetEmail} or lineId=${targetLineId}`)
    return
  }

  for (const user of users) {
    console.log(`🗑️ Hard deleting user: userId=${user.userId}, email=${user.email}, lineId=${user.lineId}`)

    await prisma.$transaction(async (tx) => {
      if (user.member) {
        const memberId = user.member.memberId
        console.log(`  Deleting member records for memberId=${memberId}...`)
        await tx.attendanceLog.deleteMany({ where: { memberId } })
        await tx.feedback.deleteMany({ where: { memberId } })
        await tx.memberProgress.deleteMany({ where: { memberId } })
        await tx.memberWorkoutPlan.deleteMany({ where: { memberId } })
        await tx.payment.deleteMany({ where: { memberId } })
        await tx.paymentAccount.deleteMany({ where: { memberId } })
        await tx.subscription.deleteMany({ where: { memberId } })
        await tx.trainingSession.deleteMany({ where: { memberId } })
        await tx.workoutLog.deleteMany({ where: { memberId } })
        await tx.workoutPlan.deleteMany({ where: { creatorMemberId: memberId } })
        await tx.member.delete({ where: { memberId } })
      }

      if (user.staff) {
        const staffId = user.staff.staffId
        console.log(`  Deleting staff record for staffId=${staffId}...`)
        await tx.staff.delete({ where: { staffId } })
      }

      console.log(`  Deleting user relations for userId=${user.userId}...`)
      await tx.notification.deleteMany({ where: { recipientUserId: user.userId } })
      await tx.userGroup.deleteMany({ where: { userId: user.userId } })
      await tx.otpCode.deleteMany({ where: { userId: user.userId } })
      await tx.otpRequestThrottle.deleteMany({ where: { userId: user.userId } })
      await tx.passwordResetGrant.deleteMany({ where: { userId: user.userId } })
      await tx.auditLog.deleteMany({ where: { actorUserId: user.userId } })
      await tx.user.delete({ where: { userId: user.userId } })
    })

    console.log(`✅ Successfully hard-deleted userId=${user.userId}`)
  }
}

main()
  .catch((err) => {
    console.error('❌ Error during hard delete:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
