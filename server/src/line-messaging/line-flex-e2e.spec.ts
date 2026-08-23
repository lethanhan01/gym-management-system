import { createHmac } from 'crypto'
import { LINE_MOCK_USER_ID, LINE_MOCK_WEBHOOK_SECRET } from '../line-mock/constants'
import { LineMessagingService } from './line-messaging.service'
import { LineMockController } from './line-mock.controller'
import * as flexBuilder from './line-flex-builder'

function sign(body: Buffer, secret = 'secret') {
  return createHmac('sha256', secret).update(body).digest('base64')
}

function decodeLiff(uri: string): string {
  try {
    return decodeURIComponent(decodeURIComponent(uri))
  } catch {
    return uri
  }
}

describe('LINE Flex Messaging End-to-End (E2E) Integration Test Suite', () => {
  let service: LineMessagingService
  let mockController: LineMockController
  let mockFetch: jest.Mock

  const mockPrisma = {
    user: {
      updateMany: jest.fn(),
    },
    trainingSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    attendanceLog: {
      findFirst: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    feedback: {
      findFirst: jest.fn(),
    },
  }

  const defaultEnv: Record<string, unknown> = {
    LINE_MESSAGING_ENABLED: 'true',
    LINE_CHANNEL_SECRET: 'secret',
    LINE_CHANNEL_ACCESS_TOKEN: 'token',
    LINE_LIFF_URL: 'https://liff.line.me/test-liff',
    LINE_REMINDER_MINUTES: 30,
    LINE_MESSAGE_LOCALE: 'vi',
  }

  const env: Record<string, unknown> = { ...defaultEnv }

  const mockConfig = {
    get: jest.fn((key: string) => env[key]),
  }

  const mockNotifications = {
    safeNotifyUser: jest.fn(),
  }

  beforeEach(() => {
    for (const key of Object.keys(env)) delete env[key]
    Object.assign(env, defaultEnv)
    service = new LineMessagingService(
      mockPrisma as any,
      mockConfig as any,
      mockNotifications as any
    )
    mockController = new LineMockController(service)
    mockFetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('') })
    global.fetch = mockFetch as any
    jest.clearAllMocks()
    mockConfig.get.mockImplementation((key: string) => env[key])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // =========================================================================
  // SCENARIO 1: TRAINING SESSION EVENTS (6 LUỒNG LỊCH TẬP PT)
  // =========================================================================
  describe('1. Luồng Thông Báo Lịch Tập PT (Training Session Events)', () => {
    const mockSession = {
      sessionId: 101n,
      startTime: new Date('2026-08-25T09:00:00Z'),
      status: 'scheduled',
      member: {
        userId: 10n,
        user: { lineId: 'U_MEMBER_001', fullName: 'Trần Văn Nam' },
      },
      trainer: { user: { fullName: 'Coach Alex' } },
      room: { name: 'Phòng Cardio 01' },
      planDay: { name: 'Cardio & HIIT Buổi 1' },
    }

    it('E2E-1: Đặt lịch tập PT mới (training.created) -> Flex Card chuẩn Tone success', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession)

      const result = await service.safePushTrainingSessionEvent('created', 101n)
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.to).toBe('U_MEMBER_001')
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.styles.header.backgroundColor).toBe('#0f1c16')
      expect(msg.contents.header.contents[0].text).toBe('ROGYM')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#1a3326') // Tone success
      expect(msg.contents.header.contents[1].contents[0].text).toBe('ĐẶT LỊCH THÀNH CÔNG')
      expect(msg.contents.body.contents[0].text).toBe('Xác nhận đặt lịch tập PT')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/workout/sessions?sessionId=101')
    })

    it('E2E-2: Điều chỉnh lịch tập PT (training.updated) -> Flex Card chuẩn Tone info', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession)

      const result = await service.safePushTrainingSessionEvent('updated', 101n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#0c2838') // Tone info
      expect(msg.contents.header.contents[1].contents[0].text).toBe('ĐÃ ĐIỀU CHỈNH LỊCH')
      expect(msg.contents.body.contents[0].text).toBe('Lịch tập đã được thay đổi')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/workout/sessions?sessionId=101')
    })

    it('E2E-3: Hủy lịch tập PT (training.cancelled) -> Flex Card chuẩn Tone danger', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession)

      const result = await service.safePushTrainingSessionEvent('cancelled', 101n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#2d1212') // Tone danger
      expect(msg.contents.header.contents[1].contents[0].text).toBe('LỊCH TẬP ĐÃ HỦY')
      expect(msg.contents.body.contents[0].text).toBe('Lịch tập đã bị hủy')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/workout/sessions')
    })

    it('E2E-4: Nhắc trước giờ tập 30p (training.reminder) -> Flex Card chuẩn Tone warning', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession)

      const result = await service.safePushTrainingSessionEvent('reminder', 101n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#2e2107') // Tone warning
      expect(msg.contents.header.contents[1].contents[0].text).toBe('SẮP ĐẾN GIỜ TẬP (30P)')
      expect(msg.contents.body.contents[0].text).toBe('Nhắc nhở buổi tập sắp diễn ra')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/workout/sessions?sessionId=101')
    })

    it('E2E-5: Đến giờ tập (training.starting) -> Flex Card chuẩn Tone success', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession)

      const result = await service.safePushTrainingSessionEvent('starting', 101n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#1a3326')
      expect(msg.contents.header.contents[1].contents[0].text).toBe('ĐẾN GIỜ TẬP')
      expect(msg.contents.body.contents[0].text).toBe('Đã đến giờ tập luyện')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/workout/sessions?sessionId=101')
    })

    it('E2E-6: Hoàn thành buổi tập (training.completed) -> Flex Card 2 nút Action (Review + History)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        ...mockSession,
        trainer: { userId: 5n, user: { fullName: 'Coach Alex' } },
      })

      const result = await service.safePushTrainingSessionCompleted(101n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].contents[0].text).toBe('BUỔI TẬP HOÀN THÀNH')
      expect(msg.contents.body.contents[0].text).toBe('Buổi tập đã hoàn thành')
      expect(msg.contents.footer.contents).toHaveLength(2)
      expect(msg.contents.footer.contents[0].action.label).toBe('Đánh giá PT')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/feedback/send')
      expect(msg.contents.footer.contents[1].action.label).toBe('Xem lịch sử')
      expect(decodeLiff(msg.contents.footer.contents[1].action.uri)).toContain('/member/workout/sessions')
    })
  })

  // =========================================================================
  // SCENARIO 2: ATTENDANCE & MEMBERSHIP SUBSCRIPTIONS
  // =========================================================================
  describe('2. Luồng Điểm Danh & Gói Tập Hội Viên', () => {
    it('E2E-7: Check-in QR tại phòng tập (attendance.checkin) -> Flex Card điểm danh', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 501n,
        startTime: new Date('2026-08-25T08:30:00Z'),
        member: { user: { lineId: 'U_MEMBER_002' } },
      })

      const result = await service.safePushAttendanceCheckin(501n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].contents[0].text).toBe('CHECK-IN THÀNH CÔNG')
      expect(msg.contents.body.contents[0].text).toBe('Check-in thành công')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/attendance')
    })

    it('E2E-8: Gói tập sắp hết hạn (subscription.expiring_soon) -> Flex Card cảnh báo kèm 2 nút CTA', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        subscriptionId: 801n,
        endDate: new Date('2026-08-26T23:59:59Z'),
        package: { name: 'Gói Diamond 3 Tháng' },
        member: { user: { lineId: 'U_MEMBER_003' } },
      })

      const result = await service.safePushSubscriptionExpiringReminder(801n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#2e2107') // Tone warning
      expect(msg.contents.header.contents[1].contents[0].text).toBe('GÓI TẬP SẮP HẾT HẠN')
      expect(msg.contents.body.contents[0].text).toBe('Gói tập sắp hết hạn')
      expect(msg.contents.footer.contents).toHaveLength(2)
      expect(msg.contents.footer.contents[0].action.label).toBe('Gia hạn ngay')
      expect(msg.contents.footer.contents[1].action.label).toBe('Xem chi tiết gói')
    })
  })

  // =========================================================================
  // SCENARIO 3: PAYMENTS & FEEDBACK
  // =========================================================================
  describe('3. Luồng Thanh Toán & Phản Hồi Khiếu Nại', () => {
    it('E2E-9: Thanh toán gói tập thành công (payment.success) -> Flex Card biên lai thanh toán', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentId: 901n,
        amount: 2500000,
        paymentMethod: 'vnpay',
        paymentCode: 'VNPAY-20260825-9988',
        subscription: { package: { name: 'Gói VIP PT 10 Buổi' } },
        member: { user: { lineId: 'U_MEMBER_004' } },
      })

      const result = await service.safePushPaymentSuccess(901n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].contents[0].text).toBe('THANH TOÁN THÀNH CÔNG')
      expect(msg.contents.body.contents[0].text).toBe('Biên lai thanh toán thành công')
      expect(JSON.stringify(msg.contents.body.contents)).toContain('2.500.000 đ')
      expect(JSON.stringify(msg.contents.body.contents)).toContain('901')
    })

    it('E2E-10: Phản hồi góp ý từ Ban Quản Lý (feedback.responded) -> Flex Card phản hồi', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue({
        feedbackId: 1001n,
        title: 'Đề xuất bổ sung thêm tạ đơn 15kg',
        respondedAt: new Date('2026-08-25T11:00:00Z'),
        responder: { fullName: 'Ban Quản Lý RoGym' },
        member: { user: { lineId: 'U_MEMBER_005' } },
      })

      const result = await service.safePushFeedbackResponded(1001n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].backgroundColor).toBe('#0c2838') // Tone info
      expect(msg.contents.header.contents[1].contents[0].text).toBe('ĐÃ CÓ PHẢN HỒI GÓP Ý')
      expect(msg.contents.body.contents[0].text).toBe('Đã có phản hồi góp ý')
      expect(decodeLiff(msg.contents.footer.contents[0].action.uri)).toContain('/member/feedback')
    })
  })

  // =========================================================================
  // SCENARIO 4: WEBHOOK INBOUND EVENTS (FOLLOW & MESSAGE)
  // =========================================================================
  describe('4. Luồng Webhook Inbound OA (Follow & Auto-reply)', () => {
    it('E2E-11: Webhook Follow (kết bạn mới) -> Gửi Flex Card Chào mừng + Gán Rich Menu', async () => {
      env.LINE_RICH_MENU_ID = 'richmenu-official-001'

      const event = {
        type: 'follow',
        replyToken: 'mock-reply-token-follow',
        source: { type: 'user', userId: 'U_NEW_FRIEND_999' },
      }
      const body = Buffer.from(JSON.stringify({ events: [event] }))
      const signature = sign(body, 'secret')

      const res = await service.handleWebhook(body, signature)
      expect(res.data.processedEvents).toBe(1)

      // Verify Reply Flex Message sent
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('CHÀO MỪNG HỘI VIÊN'),
        })
      )

      // Verify Rich Menu Assigned
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/user/U_NEW_FRIEND_999/richmenu/richmenu-official-001',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('E2E-12: Webhook Message (nhắn tin trực tiếp) -> Gửi Flex Card Trợ giúp tự động Tone muted', async () => {
      const event = {
        type: 'message',
        replyToken: 'mock-reply-token-msg',
        source: { type: 'user', userId: 'U_USER_ASKING' },
        message: { type: 'text', text: 'Xin chào phòng tập' },
      }
      const body = Buffer.from(JSON.stringify({ events: [event] }))
      const signature = sign(body, 'secret')

      const res = await service.handleWebhook(body, signature)
      expect(res.data.processedEvents).toBe(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('HỖ TRỢ TỰ ĐỘNG'),
        })
      )
    })
  })

  // =========================================================================
  // SCENARIO 5: BILINGUAL VERIFICATION (TIẾNG NHẬT JA-JP)
  // =========================================================================
  describe('5. Kiểm Thử Đa Ngôn Ngữ (Bilingual Verification JA-JP)', () => {
    it('E2E-13: Chuyển đổi LINE_MESSAGE_LOCALE=ja -> Toàn bộ thẻ hiển thị tiếng Nhật chuẩn ngữ pháp & tiền tệ Yên', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'

      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentId: 999n,
        amount: 15000,
        paymentMethod: 'クレジットカード',
        paymentCode: 'CARD-JA-8899',
        subscription: { package: { name: 'Diamond 3ヶ月プラン' } },
        member: { user: { lineId: 'U_JAPAN_MEMBER' } },
      })

      const result = await service.safePushPaymentSuccess(999n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.header.contents[1].contents[0].text).toBe('お支払い完了')
      expect(msg.contents.body.contents[0].text).toBe('お支払いが完了しました')
      expect(JSON.stringify(msg.contents.body.contents)).toContain('¥15,000')
      expect(msg.contents.footer.contents[0].action.label).toBe('プラン詳細を見る')
    })
  })

  // =========================================================================
  // SCENARIO 6: RESILIENCE & GRACEFUL FALLBACK (KHẢ NĂNG CHỊU LỖI 2 TẦNG)
  // =========================================================================
  describe('6. Kiểm Thử Cơ Chế Graceful Fallback An Toàn', () => {
    it('E2E-14: Giả lập lỗi runtime trong Flex Builder -> Tự động Fallback sang Plain Text + Quick Reply mà không ném exception', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 99n,
        startTime: new Date('2026-08-25T09:00:00Z'),
        status: 'scheduled',
        member: { user: { lineId: 'U_FALLBACK_USER', fullName: 'Test Fallback' } },
        trainer: { user: { fullName: 'Coach Alex' } },
        room: { name: 'Room 1' },
      })

      jest.spyOn(flexBuilder, 'buildTrainingBookingCreatedFlex').mockImplementation(() => {
        throw new Error('Simulated builder runtime crash!')
      })

      const result = await service.safePushTrainingSessionEvent('created', 99n)
      expect(result).toBe(true)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = payload.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Bạn đã đặt lịch tập thành công')
      expect(decodeLiff(msg.quickReply.items[0].action.uri)).toContain('/member/workout/sessions?sessionId=99')
    })

    it('E2E-15: Khi LINE API mạng bị lỗi timeout hoặc HTTP 500 -> safePush vẫn return false an toàn, không làm gián đoạn transaction', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 99n,
        startTime: new Date('2026-08-25T09:00:00Z'),
        status: 'scheduled',
        member: { user: { lineId: 'U_FAIL_USER' } },
        trainer: { user: { fullName: 'Coach Alex' } },
        room: { name: 'Room 1' },
      })

      mockFetch.mockRejectedValueOnce(new Error('LINE API Network Timeout'))

      const result = await service.safePushTrainingSessionEvent('created', 99n)
      expect(result).toBe(false)
    })
  })

  // =========================================================================
  // SCENARIO 7: MOCK SANDBOX & CONTROLLER ALL 14 SAMPLES
  // =========================================================================
  describe('7. Kiểm Thử Toàn Diện Mock Controller & Sandbox Outbox', () => {
    it('E2E-16: Tạo thành công tất cả 14 mẫu sự kiện vào in-memory Outbox ở cả 2 ngôn ngữ', () => {
      env.LINE_MOCK_ENABLED = 'true'

      const sampleList = [
        'flex',
        'rich-menu',
        'pt-booking-created',
        'pt-booking-updated',
        'pt-booking-cancelled',
        'pt-session-cancelled',
        'pt-reminder-30m',
        'pt-session-starting',
        'pt-training-completed',
        'attendance-checkin',
        'subscription-expiring',
        'payment-success',
        'feedback-responded',
        'welcome',
        'help',
      ]

      sampleList.forEach((sampleType) => {
        expect(mockController.sample({ type: sampleType, locale: 'vi' })).toEqual({ success: true })
        expect(mockController.sample({ type: sampleType, locale: 'ja' })).toEqual({ success: true })
      })

      const outbox = mockController.messages()
      expect(outbox.success).toBe(true)
      expect(outbox.data.messages.length).toBe(sampleList.length * 2)

      // Clear outbox
      expect(mockController.clearMessages()).toEqual({ success: true })
      expect(mockController.messages().data.messages).toHaveLength(0)
    })
  })
})
