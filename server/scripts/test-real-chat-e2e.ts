import * as dotenv from 'dotenv'
import * as path from 'path'

// Nạp file môi trường
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'
import { io, Socket } from 'socket.io-client'
import { JwtService } from '@nestjs/jwt'

async function main(): Promise<void> {
  const prisma = new PrismaClient()
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'un5tFdkThXiZoYE2lg2jWf+v8npcIULCd3DSZkGdKRdlqxN6eFWuxT/teukhoX1OjWB3C6U5m+58AF4JSRb20A==',
  })

  console.log('\n===============================================================')
  console.log('🚀 PREFLIGHT REAL SOCKET E2E TEST — MEMBER & TRAINER CHAT')
  console.log('===============================================================\n')

  try {
    // 1. TÌM KIẾM HOẶC THIẾT LẬP DỮ LIỆU TEST HỢP LỆ TRONG DATABASE
    console.log('📌 [Step 1/6] Chuẩn bị dữ liệu tài khoản Member & Trainer trong DB...')

    let staff = await prisma.staff.findFirst({
      where: { deletedAt: null, user: { deletedAt: null } },
      include: { user: true },
    })

    if (!staff) {
      throw new Error('Database không có Staff/Trainer hợp lệ. Vui lòng kiểm tra seed dữ liệu.')
    }

    let member = await prisma.member.findFirst({
      where: {
        deletedAt: null,
        user: { deletedAt: null },
      },
      include: { user: true },
    })

    if (!member) {
      throw new Error('Database không có Member hợp lệ.')
    }

    // Đảm bảo member được gán cho staff này
    if (member.primaryTrainerId !== staff.staffId) {
      member = await prisma.member.update({
        where: { memberId: member.memberId },
        data: { primaryTrainerId: staff.staffId },
        include: { user: true },
      })
    }

    console.log(`  ✓ Trainer: ${staff.user.fullName} (${staff.user.email}) - StaffId: ${staff.staffId}, UserId: ${staff.userId}`)
    console.log(`  ✓ Member:  ${member.user.fullName} (${member.user.email}) - MemberId: ${member.memberId}, UserId: ${member.userId}`)

    // 2. TẠO HOẶC LẤY HỘI THOẠI ACTIVE
    let conversation = await prisma.chatConversation.findUnique({
      where: {
        memberId_trainerStaffId: {
          memberId: member.memberId,
          trainerStaffId: staff.staffId,
        },
      },
    })

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          memberId: member.memberId,
          trainerStaffId: staff.staffId,
          status: 'active',
        },
      })
    } else if (conversation.status !== 'active') {
      conversation = await prisma.chatConversation.update({
        where: { conversationId: conversation.conversationId },
        data: { status: 'active' },
      })
    }

    const conversationIdStr = conversation.conversationId.toString()
    console.log(`  ✓ Chat Conversation ID: ${conversationIdStr} (status: ${conversation.status})`)

    // 3. SINH JWT ACCESS TOKEN THẬT
    const memberPayload = {
      sub: member.userId.toString(),
      email: member.user.email,
      roles: ['member'],
      memberId: member.memberId.toString(),
    }
    const memberToken = jwtService.sign(memberPayload)

    const trainerPayload = {
      sub: staff.userId.toString(),
      email: staff.user.email,
      roles: ['trainer', 'staff'],
      staffId: staff.staffId.toString(),
    }
    const trainerToken = jwtService.sign(trainerPayload)

    // Token cho user thứ 3 (stranger/unauthorized)
    const strangerToken = jwtService.sign({
      sub: '999999',
      email: 'stranger@example.com',
      roles: ['member'],
      memberId: '999999',
    })

    console.log('  ✓ Sinh JWT Access Tokens thành công cho cả 2 bên.')

    // 4. KẾT NỐI 2 SOCKET.IO CLIENTS THẬT TỚI PORT 3000
    console.log('\n📌 [Step 2/6] Khởi tạo kết nối 2 WebSocket Clients tới http://localhost:3000/chat...')
    const serverUrl = 'http://localhost:3000/chat'

    const memberSocket: Socket = io(serverUrl, {
      auth: { token: `Bearer ${memberToken}` },
      transports: ['websocket'],
      timeout: 5000,
    })

    const trainerSocket: Socket = io(serverUrl, {
      auth: { token: `Bearer ${trainerToken}` },
      transports: ['websocket'],
      timeout: 5000,
    })

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Member socket connect timeout')), 5000)
        memberSocket.on('connect', () => {
          clearTimeout(timer)
          resolve()
        })
        memberSocket.on('connect_error', (err) => reject(err))
      }),
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Trainer socket connect timeout')), 5000)
        trainerSocket.on('connect', () => {
          clearTimeout(timer)
          resolve()
        })
        trainerSocket.on('connect_error', (err) => reject(err))
      }),
    ])

    console.log('  ✓ Member Socket Connected:  ', memberSocket.id)
    console.log('  ✓ Trainer Socket Connected: ', trainerSocket.id)

    // 5. TEST KỊCH BẢN 1: JOIN CONVERSATION
    console.log('\n📌 [Step 3/6] Kiểm tra sự kiện `join_conversation`...')
    const [memberJoinAck, trainerJoinAck] = await Promise.all([
      new Promise<any>((resolve) => {
        memberSocket.emit('join_conversation', { conversationId: conversationIdStr }, (ack: any) => resolve(ack))
      }),
      new Promise<any>((resolve) => {
        trainerSocket.emit('join_conversation', { conversationId: conversationIdStr }, (ack: any) => resolve(ack))
      }),
    ])

    console.log('  Member join ack:', memberJoinAck)
    console.log('  Trainer join ack:', trainerJoinAck)

    if (!memberJoinAck?.success || !trainerJoinAck?.success) {
      throw new Error(`Join conversation thất bại: Member: ${JSON.stringify(memberJoinAck)}, Trainer: ${JSON.stringify(trainerJoinAck)}`)
    }
    console.log('  [PASS] Cả Member và Trainer đã join vào room:', conversationIdStr)

    // 6. TEST KỊCH BẢN 2: TYPING INDICATOR
    console.log('\n📌 [Step 4/6] Kiểm tra Typing Indicator (`typing_start` / `typing_stop`)...')
    const typingPromise = new Promise<{ fullName: string; userId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Typing start timeout')), 4000)
      trainerSocket.once('user_typing', (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })

    memberSocket.emit('typing_start', { conversationId: conversationIdStr })
    const typingData = await typingPromise
    console.log(`  [PASS] Trainer nhận được user_typing: "${typingData.fullName}" (userId: ${typingData.userId})`)

    const stopTypingPromise = new Promise<{ userId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Typing stop timeout')), 4000)
      trainerSocket.once('user_stop_typing', (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })

    memberSocket.emit('typing_stop', { conversationId: conversationIdStr })
    const stopTypingData = await stopTypingPromise
    console.log(`  [PASS] Trainer nhận được user_stop_typing từ userId: ${stopTypingData.userId}`)

    // 7. TEST KỊCH BẢN 3: GỬI VÀ NHẬN TIN NHẮN REAL-TIME + PERSISTENCE
    console.log('\n📌 [Step 5/6] Kiểm tra gửi & nhận tin nhắn thời gian thực (`send_message` / `new_message`)...')
    const testContent = `Tin nhắn kiểm thử tự động E2E lúc ${new Date().toLocaleTimeString('vi-VN')}`

    const memberMsgPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Member new_message timeout')), 4000)
      memberSocket.once('new_message', (msg) => {
        clearTimeout(timer)
        resolve(msg)
      })
    })

    const trainerMsgPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Trainer new_message timeout')), 4000)
      trainerSocket.once('new_message', (msg) => {
        clearTimeout(timer)
        resolve(msg)
      })
    })

    memberSocket.emit('send_message', {
      conversationId: conversationIdStr,
      content: testContent,
    })

    const [memberReceived, trainerReceived] = await Promise.all([memberMsgPromise, trainerMsgPromise])
    console.log(`  [PASS] Member nhận new_message (ID: ${memberReceived.messageId})`)
    console.log(`  [PASS] Trainer nhận new_message (ID: ${trainerReceived.messageId}, Content: "${trainerReceived.content}")`)

    // Xác nhận trong CSDL thật
    const dbMsg = await prisma.chatMessage.findUnique({
      where: { messageId: BigInt(trainerReceived.messageId) },
    })
    if (!dbMsg || dbMsg.content !== testContent) {
      throw new Error('CSDL không lưu tin nhắn chính xác.')
    }
    console.log('  [PASS] CSDL xác nhận lưu tin nhắn trong bảng `chat_messages` thành công.')

    // 8. TEST KỊCH BẢN 4: MARK SEEN
    console.log('\n📌 [Step 6/6] Kiểm tra đánh dấu đã xem (`mark_seen` / `messages_seen`)...')
    const seenPromise = new Promise<{ conversationId: string; seenByUserId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Mark seen timeout')), 4000)
      memberSocket.once('messages_seen', (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })

    trainerSocket.emit('mark_seen', { conversationId: conversationIdStr })
    const seenData = await seenPromise
    console.log(`  [PASS] Member nhận messages_seen xác nhận bởi userId: ${seenData.seenByUserId}`)

    // 9. TEST KỊCH BẢN 5: THU HỒI TIN NHẮN (HARD DELETE)
    console.log('\n📌 [Step Bonus 1] Kiểm tra thu hồi tin nhắn (`delete_message` / `message_deleted`)...')
    const memberDeletePromise = new Promise<{ messageId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Member delete timeout')), 4000)
      memberSocket.once('message_deleted', (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })

    const trainerDeletePromise = new Promise<{ messageId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Trainer delete timeout')), 4000)
      trainerSocket.once('message_deleted', (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })

    memberSocket.emit('delete_message', {
      conversationId: conversationIdStr,
      messageId: trainerReceived.messageId,
    })

    const [del1, del2] = await Promise.all([memberDeletePromise, trainerDeletePromise])
    console.log(`  [PASS] Cả Member và Trainer nhận được message_deleted cho ID: ${del1.messageId}`)

    // Xác nhận trong CSDL thật đã bị Hard Delete hoàn toàn
    const deletedCount = await prisma.chatMessage.count({
      where: { messageId: BigInt(del1.messageId) },
    })
    if (deletedCount !== 0) {
      throw new Error(`Hard delete thất bại: tin nhắn vẫn còn trong DB (count: ${deletedCount})`)
    }
    console.log('  [PASS] CSDL xác nhận bản ghi đã bị HARD DELETE hoàn toàn (0 bản ghi tồn đọng).')

    // 10. TEST KỊCH BẢN 6: BẢO MẬT & PHÂN QUYỀN (STRANGER FORBIDDEN)
    console.log('\n📌 [Step Bonus 2] Kiểm tra bảo mật từ chối user không có quyền...')
    const strangerSocket = io(serverUrl, {
      auth: { token: `Bearer ${strangerToken}` },
      transports: ['websocket'],
      timeout: 3000,
    })

    let strangerRejected = false
    await new Promise<void>((resolve) => {
      strangerSocket.on('connect_error', (err) => {
        strangerRejected = true
        console.log(`  [PASS] Server từ chối kết nối stranger socket ngay tại Handshake: "${err.message}"`)
        resolve()
      })
      strangerSocket.on('connect', async () => {
        // Nếu kết nối thành công, thử join room trái phép
        const ack: any = await new Promise((r) => {
          strangerSocket.emit('join_conversation', { conversationId: conversationIdStr }, (res: any) => r(res))
        })
        if (!ack?.success) {
          strangerRejected = true
          console.log(`  [PASS] Server từ chối stranger socket khi join room: "${ack?.message || ack?.error}"`)
        }
        resolve()
      })
    })

    if (!strangerRejected) {
      throw new Error('Bảo mật thất bại: Stranger có thể kết nối và join room trái phép!')
    }

    strangerSocket.disconnect()

    // 11. DỌN DẸP & NGẮT KẾT NỐI
    memberSocket.disconnect()
    trainerSocket.disconnect()

    console.log('\n===============================================================')
    console.log('🎉 TẤT CẢ 6/6 KỊCH BẢN WEBSOCKET E2E ĐỀU ĐẠT CHUẨN PASS 100%')
    console.log('===============================================================')
    console.log('\n🔑 THÔNG TIN TÀI KHOẢN ĐỂ KIỂM THỬ GIAO DIỆN THỰC TẾ (SUB-PHASE 7.3):')
    console.log(`  👉 TÀI KHOẢN HỘI VIÊN (Member):`)
    console.log(`     - Email:    ${member.user.email}`)
    console.log(`     - Họ tên:   ${member.user.fullName}`)
    console.log(`     - MemberId: ${member.memberId}`)
    console.log(`  👉 TÀI KHOẢN HUẤN LUYỆN VIÊN (Trainer):`)
    console.log(`     - Email:    ${staff.user.email}`)
    console.log(`     - Họ tên:   ${staff.user.fullName}`)
    console.log(`     - StaffId:  ${staff.staffId}`)
    console.log(`  👉 CUỘC TRÒ CHUYỆN (Conversation ID): ${conversationIdStr}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('\n❌ [FAIL] Preflight Socket E2E Test encountered an error:', err)
  process.exit(1)
})
