import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'crypto'
import { LINE_MOCK_USER_ID, LINE_MOCK_WEBHOOK_SECRET } from '../line-mock/constants'
import * as flexBuilder from './line-flex-builder'
import { LineMessagingService } from './line-messaging.service'

function sign(body: Buffer, secret = 'secret') {
  return createHmac('sha256', secret).update(body).digest('base64')
}

function makeSession(overrides: object = {}) {
  return {
    sessionId: 1n,
    startTime: new Date('2026-07-17T10:00:00Z'),
    status: 'scheduled',
    member: {
      userId: 100n,
      user: { lineId: 'U123', fullName: 'Nguyễn Văn A' },
    },
    trainer: { user: { fullName: 'Coach Alex' } },
    room: { name: 'Room A' },
    planDay: { name: 'Chest Day' },
    ...overrides,
  }
}

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
}

const env: Record<string, unknown> = { ...defaultEnv }

const mockConfig = {
  get: jest.fn((key: string) => env[key]),
}

const mockNotifications = {
  safeNotifyUser: jest.fn(),
}

describe('LineMessagingService', () => {
  let service: LineMessagingService
  let mockFetch: jest.Mock

  beforeEach(() => {
    for (const key of Object.keys(env)) delete env[key]
    Object.assign(env, defaultEnv)
    service = new LineMessagingService(
      mockPrisma as any,
      mockConfig as any,
      mockNotifications as any
    )
    mockFetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('') })
    global.fetch = mockFetch as any
    jest.clearAllMocks()
    mockConfig.get.mockImplementation((key: string) => env[key])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects webhook requests with an invalid signature', async () => {
    const body = Buffer.from(JSON.stringify({ events: [] }))

    await expect(service.handleWebhook(body, 'bad-signature')).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  // =========================================================================
  // TẦNG 1: UNIT TEST HAPPY PATH (FLEX MESSAGE PAYLOADS & SONG NGỮ)
  // =========================================================================

  describe('Tầng 1: Webhook Follow & Message (Happy Path Flex Card)', () => {
    it('replies with Welcome Flex Card when a user follows the OA (vi)', async () => {
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'follow',
              replyToken: 'reply-token',
              source: { type: 'user', userId: 'U123' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        expect.objectContaining({
          method: 'POST',
        })
      )
      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]

      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('Chào mừng bạn đến với RoGym')
      expect(msg.contents.type).toBe('bubble')
      expect(msg.contents.body.contents[0].text).toContain('Chào mừng bạn đến với RoGym!')
      expect(msg.contents.footer.contents[0].action.uri).toContain(
        'https://liff.line.me/test-liff?redirect=%2Fmember'
      )
    })

    it('replies with Welcome Flex Card in Japanese when LINE_MESSAGE_LOCALE is ja', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'follow',
              replyToken: 'reply-token-ja',
              source: { type: 'user', userId: 'U123' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('RoGymへようこそ')
      expect(msg.contents.body.contents[0].text).toContain('RoGymへようこそ！')
      expect(msg.contents.footer.contents[0].action.label).toBe('アプリを開く')
    })

    it('replies with Help Flex Card when a user sends a message (vi)', async () => {
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'reply-token-msg',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'text', text: 'Xin chào!' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        expect.objectContaining({ method: 'POST' })
      )
      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]

      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('Trung tâm hỗ trợ tự động RoGym')
      expect(msg.contents.body.contents[0].text).toBe('Trung tâm hỗ trợ RoGym')
      expect(msg.contents.footer.contents[0].action.uri).toContain(
        'redirect=%2Fmember'
      )
    })

    it('replies with Japanese Help Flex Card when LINE_MESSAGE_LOCALE is ja', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'reply-token-ja',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'text', text: 'help' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('RoGym自動応答サポート')
      expect(msg.contents.body.contents[0].text).toBe('RoGymサポートデスク')
      expect(msg.contents.footer.contents[0].action.label).toBe('アプリを開く')
    })

    it('does not reply when message event has no replyToken', async () => {
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'text', text: 'hello' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('records message reply in mock outbox when mock mode is enabled', async () => {
      env.LINE_MOCK_ENABLED = 'true'
      env.CLIENT_URL = 'http://localhost:5173'
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'mock-reply-msg',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'text', text: 'test' },
            },
          ],
        })
      )
      const sig = createHmac('sha256', LINE_MOCK_WEBHOOK_SECRET).update(body).digest('base64')

      await service.handleWebhook(body, sig)

      expect(mockFetch).not.toHaveBeenCalled()
      const messages = service.getMockMessages()
      expect(messages).toEqual([
        expect.objectContaining({
          kind: 'reply',
          liffUrl: 'http://localhost:5173/liff?redirect=%2Fmember',
          payload: expect.objectContaining({
            replyToken: 'mock-reply-msg',
            messages: [
              expect.objectContaining({
                type: 'flex',
                altText: expect.stringContaining('Trung tâm hỗ trợ tự động RoGym'),
              }),
            ],
          }),
        }),
      ])
    })
  })

  describe('Tầng 1: Training Session Push Events (Happy Path Flex Card)', () => {
    it('pushes training.created Flex Card when member has a LINE id (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({
          body: expect.stringContaining('redirect=%2Fmember%2Fworkout%2Fsessions%3FsessionId%3D1'),
        })
      )
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]

      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('Coach Alex')
      expect(msg.contents.body.contents[0].text).toBe('Xác nhận đặt lịch tập PT')
      expect(msg.contents.footer.contents[0].action.label).toBe('Xem chi tiết')
    })

    it('pushes training.updated Flex Card (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('updated', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('Lịch tập đã được thay đổi')
      expect(msg.contents.footer.contents[0].action.uri).toContain('sessionId%3D1')
    })

    it('pushes training.cancelled Flex Card (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('cancelled', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('Lịch tập đã bị hủy')
      expect(msg.contents.footer.contents[0].action.uri).toContain(
        'redirect=%2Fmember%2Fworkout%2Fsessions'
      )
    })

    it('pushes training.reminder Flex Card (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('reminder', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('Nhắc nhở buổi tập sắp diễn ra')
      expect(msg.altText).toContain('30 phút')
    })

    it('pushes training.starting Flex Card (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('starting', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('Đã đến giờ tập luyện')
    })

    it('uses Japanese training templates when LINE_MESSAGE_LOCALE is ja', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

      await expect(service.safePushTrainingSessionEvent('reminder', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('30分')
      expect(msg.contents.body.contents[0].text).toBe('まもなくトレーニング開始です')
      expect(msg.contents.footer.contents[0].action.label).toBe('詳細を見る')

      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      await expect(service.safePushTrainingSessionEvent('starting', 1n)).resolves.toBe(true)
      const startingBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(startingBody.messages[0].contents.body.contents[0].text).toBe('トレーニングの時間です')
    })

    it('returns false when member has no LINE id', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        makeSession({ member: { userId: 100n, user: { lineId: null, fullName: 'Member' } } })
      )

      await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Tầng 1: Attendance Check-in Push (Happy Path Flex Card)', () => {
    it('pushes Attendance Check-in Flex Card (vi)', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 50n,
        startTime: new Date('2026-08-20T08:30:00Z'),
        member: { user: { lineId: 'U_ATTENDANCE' } },
      })

      await expect(service.safePushAttendanceCheckin(50n)).resolves.toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({
          body: expect.stringContaining('redirect=%2Fmember%2Fattendance'),
        })
      )
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('Check-in thành công')
      expect(msg.contents.footer.contents[0].action.label).toBe('Xem thẻ & lịch sử')
    })

    it('pushes Attendance Check-in Flex Card in Japanese (ja)', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 50n,
        startTime: new Date('2026-08-20T08:30:00Z'),
        member: { user: { lineId: 'U_ATTENDANCE_JA' } },
      })

      await expect(service.safePushAttendanceCheckin(50n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('チェックイン完了')
      expect(msg.contents.footer.contents[0].action.label).toBe('会員証・履歴を見る')
    })

    it('returns false when member has no LINE id for attendance', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 51n,
        startTime: new Date(),
        member: { user: { lineId: null } },
      })

      await expect(service.safePushAttendanceCheckin(51n)).resolves.toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Tầng 1: Subscription Expiring Push (Happy Path Flex Card & 2 CTA Buttons)', () => {
    it('pushes Subscription Expiring Flex Card with 2 CTA buttons (vi)', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        subscriptionId: 10n,
        endDate: new Date('2026-08-19T00:00:00Z'),
        package: { name: 'Gói VIP 1 Tháng' },
        member: { user: { lineId: 'U_SUB_123' } },
      })

      await expect(service.safePushSubscriptionExpiringReminder(10n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.to).toBe('U_SUB_123')
      const msg = body.messages[0]

      expect(msg.type).toBe('flex')
      expect(msg.altText).toContain('Gói VIP 1 Tháng')
      expect(msg.contents.body.contents[0].text).toBe('Gói tập sắp hết hạn')
      // Primary button
      expect(msg.contents.footer.contents[0].action.label).toBe('Gia hạn ngay')
      expect(msg.contents.footer.contents[0].action.uri).toContain(
        'redirect=%2Fmember%2Fsubscription%2Fcurrent'
      )
      // Secondary button
      expect(msg.contents.footer.contents[1].action.label).toBe('Xem chi tiết gói')
      expect(msg.contents.footer.contents[1].action.uri).toContain(
        'redirect=%2Fmember%2Fprofile'
      )
    })

    it('pushes Japanese subscription expiring reminder when LINE_MESSAGE_LOCALE is ja', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        subscriptionId: 10n,
        endDate: new Date('2026-08-19T00:00:00Z'),
        package: { name: 'Premium Plan' },
        member: { user: { lineId: 'U_SUB_JA' } },
      })

      await expect(service.safePushSubscriptionExpiringReminder(10n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('flex')
      expect(msg.contents.body.contents[0].text).toBe('プランの有効期限間近')
      expect(msg.contents.footer.contents[0].action.label).toBe('今すぐ更新')
      expect(msg.contents.footer.contents[1].action.label).toBe('プラン詳細を見る')
    })
  })

  // =========================================================================
  // TẦNG 2: KIỂM THỬ MA TRẬN GRACEFUL FALLBACK (RESILIENCE & GIÁNG CẤP VỀ TEXT)
  // =========================================================================

  describe('Tầng 2: Graceful Fallback Matrix (Failure Resilience)', () => {
    it('falls back to Legacy Text when buildTrainingBookingCreatedFlex throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      jest.spyOn(flexBuilder, 'buildTrainingBookingCreatedFlex').mockImplementation(() => {
        throw new Error('Simulated builder error for created')
      })

      await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Bạn đã đặt lịch tập thành công.')
      expect(msg.quickReply.items[0].action.label).toBe('Xem chi tiết')
    })

    it('falls back to Legacy Text when buildTrainingBookingUpdatedFlex throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      jest.spyOn(flexBuilder, 'buildTrainingBookingUpdatedFlex').mockImplementation(() => {
        throw new Error('Simulated builder error for updated')
      })

      await expect(service.safePushTrainingSessionEvent('updated', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Lịch tập của bạn đã được cập nhật.')
    })

    it('falls back to Legacy Text when buildTrainingBookingCancelledFlex throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      jest.spyOn(flexBuilder, 'buildTrainingBookingCancelledFlex').mockImplementation(() => {
        throw new Error('Simulated builder error for cancelled')
      })

      await expect(service.safePushTrainingSessionEvent('cancelled', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('đã bị hủy')
    })

    it('falls back to Legacy Text when buildTrainingReminderFlex throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      jest.spyOn(flexBuilder, 'buildTrainingReminderFlex').mockImplementation(() => {
        throw new Error('Simulated builder error for reminder')
      })

      await expect(service.safePushTrainingSessionEvent('reminder', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Buổi tập của bạn sẽ bắt đầu sau 30 phút.')
    })

    it('falls back to Legacy Text when buildTrainingStartingFlex throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      jest.spyOn(flexBuilder, 'buildTrainingStartingFlex').mockImplementation(() => {
        throw new Error('Simulated builder error for starting')
      })

      await expect(service.safePushTrainingSessionEvent('starting', 1n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Đến giờ tập của bạn.')
    })

    it('falls back to Legacy Text when buildAttendanceCheckinFlex throws', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 50n,
        startTime: new Date('2026-08-20T08:30:00Z'),
        member: { user: { lineId: 'U_ATTENDANCE' } },
      })
      jest.spyOn(flexBuilder, 'buildAttendanceCheckinFlex').mockImplementation(() => {
        throw new Error('Simulated attendance builder crash')
      })

      await expect(service.safePushAttendanceCheckin(50n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toBe('Bạn đã check-in thành công tại RoGym.')
      expect(msg.quickReply.items[0].action.label).toBe('Xem chi tiết')
    })

    it('falls back to Legacy Text when buildSubscriptionExpiringFlex throws', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        subscriptionId: 10n,
        endDate: new Date('2026-08-19T00:00:00Z'),
        package: { name: 'Gói VIP 1 Tháng' },
        member: { user: { lineId: 'U_SUB_123' } },
      })
      jest.spyOn(flexBuilder, 'buildSubscriptionExpiringFlex').mockImplementation(() => {
        throw new Error('Simulated subscription builder crash')
      })

      await expect(service.safePushSubscriptionExpiringReminder(10n)).resolves.toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = body.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Gói tập Gói VIP 1 Tháng của bạn sẽ hết hạn vào ngày mai')
      expect(msg.quickReply.items[0].action.label).toBe('Gia hạn ngay')
    })

    it('falls back to Legacy Text when buildWelcomeFlex throws on follow event', async () => {
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'follow',
              replyToken: 'reply-token-follow-fallback',
              source: { type: 'user', userId: 'U123' },
            },
          ],
        })
      )
      jest.spyOn(flexBuilder, 'buildWelcomeFlex').mockImplementation(() => {
        throw new Error('Simulated welcome builder crash')
      })

      await service.handleWebhook(body, sign(body))

      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('Chào mừng bạn đến với RoGym')
      expect(msg.quickReply.items[0].action.label).toBe('Mở ứng dụng')
    })

    it('falls back to Legacy Text when buildHelpAutoReplyFlex throws on message event', async () => {
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'reply-token-help-fallback',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'text', text: 'help' },
            },
          ],
        })
      )
      jest.spyOn(flexBuilder, 'buildHelpAutoReplyFlex').mockImplementation(() => {
        throw new Error('Simulated help builder crash')
      })

      await service.handleWebhook(body, sign(body))

      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const msg = replyBody.messages[0]
      expect(msg.type).toBe('text')
      expect(msg.text).toContain('RoGym không hỗ trợ trả lời tin nhắn trực tiếp')
      expect(msg.quickReply.items[0].action.label).toBe('Mở ứng dụng')
    })
  })

  // =========================================================================
  // CÁC TEST CASE KHÁC (Dev Mock, Unsend, Rich Menu, Scheduled Reminders, Unfollow)
  // =========================================================================

  it('unlinks the matching app user when LINE sends an unfollow event', async () => {
    const body = Buffer.from(
      JSON.stringify({
        events: [{ type: 'unfollow', source: { type: 'user', userId: 'U123' } }],
      })
    )
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })

    await service.handleWebhook(body, sign(body))

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { lineId: 'U123', deletedAt: null },
      data: { lineId: null },
    })
  })

  it('captures mock messages locally and never calls the LINE API', async () => {
    env.LINE_MOCK_ENABLED = 'true'
    env.CLIENT_URL = 'http://localhost:5173'
    mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

    await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(true)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(service.getMockMessages()).toEqual([
      expect.objectContaining({
        kind: 'push',
        recipient: 'U123',
        liffUrl:
          'http://localhost:5173/liff?redirect=%2Fmember%2Fworkout%2Fsessions%3FsessionId%3D1',
      }),
    ])
  })

  it('simulates a signed follow webhook and can clear its mock outbox', async () => {
    env.LINE_MOCK_ENABLED = 'true'
    env.CLIENT_URL = 'http://localhost:5173'

    await expect(service.simulateMockEvent('follow')).resolves.toEqual({
      data: { processedEvents: 1, enabled: true },
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(service.getMockMessages()).toEqual([
      expect.objectContaining({
        kind: 'reply',
        recipient: expect.stringMatching(/^mock-reply-/),
        liffUrl: 'http://localhost:5173/liff?redirect=%2Fmember',
      }),
    ])

    service.clearMockMessages()
    expect(service.getMockMessages()).toEqual([])
  })

  it('creates visual Flex and Rich Menu samples with Flex Builder in mock mode', () => {
    env.LINE_MOCK_ENABLED = 'true'
    env.CLIENT_URL = 'http://localhost:5173'

    service.createMockSample('flex')
    service.createMockSample('rich-menu')
    service.createMockSample('pt-booking-created')
    service.createMockSample('pt-reminder-30m')
    service.createMockSample('pt-session-cancelled')

    const messages = service.getMockMessages()
    expect(messages.length).toBe(5)
    expect(messages[0].kind).toBe('push') // pt-session-cancelled (reversed order)
    expect(messages[0].payload).toMatchObject({
      messages: [
        expect.objectContaining({
          type: 'flex',
          contents: expect.objectContaining({
            body: expect.objectContaining({
              contents: expect.arrayContaining([
                expect.objectContaining({ text: 'Lịch tập đã bị hủy' }),
              ]),
            }),
          }),
        }),
      ],
    })
  })

  it('rejects visual samples when mock mode is disabled', () => {
    expect(() => service.createMockSample('flex')).toThrow('LINE Mock is disabled')
  })

  it('creates both in-app reminders without requiring LINE, and skips LINE when deduped', async () => {
    env.LINE_MESSAGING_ENABLED = 'false'
    mockPrisma.trainingSession.findMany.mockResolvedValue([
      makeSession({ member: { userId: 100n, user: { lineId: null, fullName: 'Member' } } }),
    ])
    mockNotifications.safeNotifyUser.mockResolvedValue(false)

    await service.sendUpcomingSessionReminders()

    expect(mockNotifications.safeNotifyUser).toHaveBeenNthCalledWith(
      1,
      100n,
      expect.objectContaining({ type: 'training.reminder', dedupeKey: 'training:1:reminder:30' })
    )
    expect(mockNotifications.safeNotifyUser).toHaveBeenNthCalledWith(
      2,
      100n,
      expect.objectContaining({ type: 'training.starting', dedupeKey: 'training:1:starting' })
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  describe('unsend & safeUnsend', () => {
    it('throws BadRequestException if messageId is empty', async () => {
      await expect(service.unsend('')).rejects.toBeInstanceOf(BadRequestException)
    })

    it('sends POST request to LINE unsend API when messaging is enabled', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: jest.fn().mockResolvedValue('') })

      const result = await service.unsend('msg-id-12345')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/unsend',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ messageId: 'msg-id-12345' }),
        })
      )
    })

    it('returns false when LINE unsend API returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Message not found or older than 24 hours'),
      })

      const result = await service.unsend('msg-id-expired')
      expect(result).toBe(false)
    })

    it('records unsend event in mock outbox when mock mode is enabled', async () => {
      env.LINE_MOCK_ENABLED = 'true'

      const result = await service.unsend('mock-msg-999')

      expect(result).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(service.getMockMessages()).toEqual([
        expect.objectContaining({
          kind: 'unsend',
          recipient: 'system',
          payload: { messageId: 'mock-msg-999' },
        }),
      ])
    })

    it('safeUnsend catches errors and returns false', async () => {
      jest.spyOn(service, 'unsend').mockRejectedValueOnce(new Error('Network failure'))

      const result = await service.safeUnsend('msg-err')
      expect(result).toBe(false)
    })
  })

  describe('assignRichMenu & safeAssignRichMenu', () => {
    it('assigns rich menu to user on follow event when LINE_RICH_MENU_ID is configured', async () => {
      env.LINE_RICH_MENU_ID = 'richmenu-abc123'
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'follow',
              replyToken: 'reply-token',
              source: { type: 'user', userId: 'U123' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/user/U123/richmenu/richmenu-abc123',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        })
      )
    })

    it('returns false if LINE_RICH_MENU_ID is not configured', async () => {
      delete env.LINE_RICH_MENU_ID
      const result = await service.assignRichMenu('U123')
      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('records rich-menu entry in mock outbox when mock mode is enabled', async () => {
      env.LINE_MOCK_ENABLED = 'true'
      env.LINE_RICH_MENU_ID = 'richmenu-mock-001'

      const result = await service.assignRichMenu('U123')

      expect(result).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(service.getMockMessages()).toEqual([
        expect.objectContaining({
          kind: 'rich-menu',
          recipient: 'U123',
          payload: { userId: 'U123', richMenuId: 'richmenu-mock-001' },
        }),
      ])
    })

    it('returns false when LINE API returns non-ok status', async () => {
      env.LINE_RICH_MENU_ID = 'richmenu-bad'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Rich menu not found'),
      })

      const result = await service.assignRichMenu('U123')
      expect(result).toBe(false)
    })

    it('safeAssignRichMenu catches exceptions and returns false', async () => {
      jest.spyOn(service, 'assignRichMenu').mockRejectedValueOnce(new Error('Network error'))

      const result = await service.safeAssignRichMenu('U123')
      expect(result).toBe(false)
    })
  })

  describe('safePushPaymentSuccess', () => {
    const makePaymentRow = (overrides = {}) => ({
      paymentId: 501n,
      amount: '500000',
      method: 'vnpay',
      transactionReference: 'VNP123456',
      paidAt: new Date('2026-08-20T10:00:00Z'),
      subscription: {
        package: { name: 'Gói VIP 12 Tháng' },
      },
      member: {
        user: { lineId: 'U_PAYER_123' },
      },
      ...overrides,
    })

    it('pushes payment.success Flex Card (vi)', async () => {
      mockPrisma.payment.findFirst.mockResolvedValueOnce(makePaymentRow())

      const result = await service.safePushPaymentSuccess(501n)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('THANH TOÁN THÀNH CÔNG'),
        })
      )
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.to).toBe('U_PAYER_123')
      expect(sentPayload.messages[0].type).toBe('flex')
      expect(sentPayload.messages[0].contents.header.contents[1].backgroundColor).toBe('#1a3326')
    })

    it('pushes payment.success Flex Card (ja)', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.payment.findFirst.mockResolvedValueOnce(makePaymentRow())

      const result = await service.safePushPaymentSuccess(501n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].type).toBe('flex')
      expect(sentPayload.messages[0].altText).toContain('お支払いが完了しました')
    })

    it('falls back to plain text when Flex builder throws', async () => {
      mockPrisma.payment.findFirst.mockResolvedValueOnce(makePaymentRow())
      jest.spyOn(flexBuilder, 'buildPaymentSuccessFlex').mockImplementationOnce(() => {
        throw new Error('Builder failed')
      })

      const result = await service.safePushPaymentSuccess(501n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].type).toBe('text')
      expect(sentPayload.messages[0].text).toContain('Thanh toán thành công gói tập')
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].quickReply.items[0].action.uri)
        )
      ).toContain('/member/subscription/current')
    })

    it('returns false when member has no lineId', async () => {
      mockPrisma.payment.findFirst.mockResolvedValueOnce(
        makePaymentRow({ member: { user: { lineId: null } } })
      )

      const result = await service.safePushPaymentSuccess(501n)

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('catches error and returns false when push fails', async () => {
      mockPrisma.payment.findFirst.mockRejectedValueOnce(new Error('DB Error'))

      const result = await service.safePushPaymentSuccess(501n)

      expect(result).toBe(false)
    })
  })

  describe('safePushTrainingSessionCompleted', () => {
    const makeCompletedSession = (overrides = {}) => ({
      sessionId: 601n,
      startTime: new Date('2026-08-20T10:00:00Z'),
      member: { userId: 100n, user: { lineId: 'U_TRAINEE_123', fullName: 'Học viên A' } },
      trainer: { user: { fullName: 'HLV Minh' } },
      room: { name: 'Phòng PT 01' },
      planDay: { name: 'Tập Lưng Xô' },
      ...overrides,
    })

    it('pushes training.completed Flex Card with 2 CTA buttons (vi)', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(makeCompletedSession())

      const result = await service.safePushTrainingSessionCompleted(601n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.to).toBe('U_TRAINEE_123')
      expect(sentPayload.messages[0].type).toBe('flex')
      expect(sentPayload.messages[0].contents.header.contents[1].backgroundColor).toBe('#1a3326')
      expect(sentPayload.messages[0].contents.footer.contents).toHaveLength(2)
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].contents.footer.contents[0].action.uri)
        )
      ).toContain('/member/feedback/send')
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].contents.footer.contents[1].action.uri)
        )
      ).toContain('/member/workout/sessions')
    })

    it('pushes training.completed Flex Card (ja)', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(makeCompletedSession())

      const result = await service.safePushTrainingSessionCompleted(601n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].altText).toContain('トレーニングセッションが完了しました')
    })

    it('falls back to plain text when Flex builder throws', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(makeCompletedSession())
      jest.spyOn(flexBuilder, 'buildTrainingCompletedFlex').mockImplementationOnce(() => {
        throw new Error('Builder failed')
      })

      const result = await service.safePushTrainingSessionCompleted(601n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].type).toBe('text')
      expect(sentPayload.messages[0].text).toContain('đã hoàn thành')
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].quickReply.items[0].action.uri)
        )
      ).toContain('/member/feedback/send')
    })

    it('returns false when member has no lineId', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(
        makeCompletedSession({ member: { userId: 100n, user: { lineId: null, fullName: 'A' } } })
      )

      const result = await service.safePushTrainingSessionCompleted(601n)

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('catches error and returns false when push fails', async () => {
      mockPrisma.trainingSession.findFirst.mockRejectedValueOnce(new Error('DB Error'))

      const result = await service.safePushTrainingSessionCompleted(601n)

      expect(result).toBe(false)
    })
  })

  describe('safePushFeedbackResponded', () => {
    const makeFeedbackRow = (overrides = {}) => ({
      feedbackId: 701n,
      content: 'Chất lượng phòng tập rất tốt nhưng máy lạnh hơi lạnh',
      handledAt: new Date('2026-08-20T11:00:00Z'),
      resolutionNote: 'Ban quản lý đã điều chỉnh nhiệt độ điều hòa',
      member: { user: { lineId: 'U_FEEDBACK_123' } },
      handledByStaff: { user: { fullName: 'Quản lý Hùng' } },
      ...overrides,
    })

    it('pushes feedback.responded Flex Card with Tone info (vi)', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValueOnce(makeFeedbackRow())

      const result = await service.safePushFeedbackResponded(701n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.to).toBe('U_FEEDBACK_123')
      expect(sentPayload.messages[0].type).toBe('flex')
      expect(sentPayload.messages[0].contents.header.contents[1].backgroundColor).toBe('#0c2838')
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].contents.footer.contents[0].action.uri)
        )
      ).toContain('/member/feedback')
    })

    it('pushes feedback.responded Flex Card (ja)', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      mockPrisma.feedback.findFirst.mockResolvedValueOnce(makeFeedbackRow())

      const result = await service.safePushFeedbackResponded(701n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].altText).toContain('ご意見への返答が届きました')
    })

    it('falls back to plain text when Flex builder throws', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValueOnce(makeFeedbackRow())
      jest.spyOn(flexBuilder, 'buildFeedbackRespondedFlex').mockImplementationOnce(() => {
        throw new Error('Builder failed')
      })

      const result = await service.safePushFeedbackResponded(701n)

      expect(result).toBe(true)
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentPayload.messages[0].type).toBe('text')
      expect(sentPayload.messages[0].text).toContain('đã nhận được phản hồi')
      expect(
        decodeURIComponent(
          decodeURIComponent(sentPayload.messages[0].quickReply.items[0].action.uri)
        )
      ).toContain('/member/feedback')
    })

    it('returns false when member has no lineId', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValueOnce(
        makeFeedbackRow({ member: { user: { lineId: null } } })
      )

      const result = await service.safePushFeedbackResponded(701n)

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('catches error and returns false when push fails', async () => {
      mockPrisma.feedback.findFirst.mockRejectedValueOnce(new Error('DB Error'))

      const result = await service.safePushFeedbackResponded(701n)

      expect(result).toBe(false)
    })
  })
})
