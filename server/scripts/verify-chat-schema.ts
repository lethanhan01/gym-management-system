import { Prisma } from '@prisma/client'
import { PrismaService } from '../src/prisma/prisma.service'

async function main(): Promise<void> {
  const prisma = new PrismaService()

  console.log('--- Starting Chat Schema Integrity & Relationship Verification ---')

  try {
    // 1. Find a valid Member and Staff to test with
    const member = await prisma.member.findFirst({
      include: { user: true },
    })
    const staff = await prisma.staff.findFirst({
      include: { user: true },
    })

    if (!member || !staff) {
      console.warn('Skipping FK relationship test: Database requires at least 1 Member and 1 Staff.')
      return
    }

    console.log(`[PASS] Found test Member ID: ${member.memberId}, Staff ID: ${staff.staffId}`)

    // 2. Clean up any leftover test conversation if exists
    await prisma.chatConversation.deleteMany({
      where: {
        memberId: member.memberId,
        trainerStaffId: staff.staffId,
      },
    })

    // 3. Create a test ChatConversation
    const conversation = await prisma.chatConversation.create({
      data: {
        memberId: member.memberId,
        trainerStaffId: staff.staffId,
        status: 'active',
        lastMessageContent: 'Hello from verification script',
        lastMessageAt: new Date(),
      },
    })
    console.log(`[PASS] Created ChatConversation ID: ${conversation.conversationId}`)

    // 4. Create a test Text ChatMessage
    const textMsg = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.conversationId,
        senderUserId: member.userId,
        messageType: 'text',
        content: 'Xin chào Huấn luyện viên! Đây là tin nhắn kiểm thử.',
      },
    })
    console.log(`[PASS] Created Text ChatMessage ID: ${textMsg.messageId}`)

    // 5. Create a test Image ChatMessage (without file attachment)
    const imgMsg = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.conversationId,
        senderUserId: staff.userId,
        messageType: 'image',
        content: 'https://example.com/test-meal.jpg',
      },
    })
    console.log(`[PASS] Created Image ChatMessage ID: ${imgMsg.messageId}`)

    // 6. Verify messages count for conversation
    const msgCount = await prisma.chatMessage.count({
      where: { conversationId: conversation.conversationId },
    })
    if (msgCount !== 2) {
      throw new Error(`Expected 2 messages, found ${msgCount}`)
    }
    console.log(`[PASS] Verified message count: ${msgCount}`)

    // 7. Verify Unique Constraint: (memberId, trainerStaffId)
    let duplicateCaught = false
    try {
      await prisma.chatConversation.create({
        data: {
          memberId: member.memberId,
          trainerStaffId: staff.staffId,
          status: 'active',
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        duplicateCaught = true
      } else {
        throw error
      }
    }

    if (!duplicateCaught) {
      throw new Error('Unique constraint on (memberId, trainerStaffId) failed to trigger P2002!')
    }
    console.log('[PASS] Unique constraint @@unique([memberId, trainerStaffId]) verified successfully.')

    // 8. Verify Cascade Delete on messages when conversation is deleted
    await prisma.chatConversation.delete({
      where: { conversationId: conversation.conversationId },
    })

    const remainingMessages = await prisma.chatMessage.count({
      where: { conversationId: conversation.conversationId },
    })

    if (remainingMessages !== 0) {
      throw new Error(`Cascade delete failed: ${remainingMessages} messages remain after conversation delete.`)
    }
    console.log('[PASS] Cascade delete on ChatMessage verified: 0 orphan messages remaining.')

    console.log('--- All Chat Schema integrity checks passed successfully! ---')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('[FAIL] Chat schema verification error:', error)
  process.exit(1)
})
