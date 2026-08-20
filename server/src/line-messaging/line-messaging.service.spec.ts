import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'crypto'
import { LINE_MOCK_WEBHOOK_SECRET } from '../line-mock/constants'
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
      user: { lineId: 'U123', fullName: 'Member' },
    },
    trainer: { user: { fullName: 'Trainer' } },
    room: { name: 'Room A' },
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
  subscription: {
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

  it('rejects webhook requests with an invalid signature', async () => {
    const body = Buffer.from(JSON.stringify({ events: [] }))

    await expect(service.handleWebhook(body, 'bad-signature')).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it('replies with a LIFF button when a user follows the OA', async () => {
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
        body: expect.stringContaining('https://liff.line.me/test-liff?redirect=%2Fmember'),
      })
    )
    const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(replyBody.messages[0].quickReply.items[0].action.uri).toBe(
      'https://liff.line.me/test-liff?redirect=%2Fmember'
    )
    expect(replyBody).toEqual(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            text: 'Chào mừng bạn đến với RoGym. Bấm nút bên dưới để mở ứng dụng hội viên.',
            quickReply: expect.objectContaining({
              items: [
                expect.objectContaining({
                  action: expect.objectContaining({ label: 'Mở ứng dụng' }),
                }),
              ],
            }),
          }),
        ],
      })
    )
  })

  describe('message event', () => {
    it('replies with helpText and LIFF button when a user sends any message (vi)', async () => {
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
      expect(replyBody.replyToken).toBe('reply-token-msg')
      expect(replyBody.messages[0].text).toContain('RoGym không hỗ trợ trả lời tin nhắn trực tiếp')
      expect(replyBody.messages[0].quickReply.items[0].action.uri).toContain(
        'redirect=%2Fmember'
      )
    })

    it('replies with Japanese helpText when LINE_MESSAGE_LOCALE is ja', async () => {
      env.LINE_MESSAGE_LOCALE = 'ja'
      const body = Buffer.from(
        JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'reply-token-ja',
              source: { type: 'user', userId: 'U123' },
              message: { type: 'sticker' },
            },
          ],
        })
      )

      await service.handleWebhook(body, sign(body))

      const replyBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(replyBody.messages[0].text).toContain('RoGymは自動返信に対応していません')
      expect(replyBody.messages[0].quickReply.items[0].action.label).toBe('アプリを開く')
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
          payload: expect.objectContaining({
            replyToken: 'mock-reply-msg',
            messages: [
              expect.objectContaining({
                text: expect.stringContaining('RoGym không hỗ trợ trả lời tin nhắn trực tiếp'),
              }),
            ],
          }),
        }),
      ])
    })
  })

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

  it('pushes training messages only when the member has a LINE id', async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(
      makeSession({ member: { userId: 100n, user: { lineId: null, fullName: 'Member' } } })
    )

    await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()

    mockPrisma.trainingSession.findFirst.mockResolvedValueOnce(makeSession())

    await expect(service.safePushTrainingSessionEvent('created', 1n)).resolves.toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({
        body: expect.stringContaining('redirect=%2Fmember%2Fworkout%2Fsessions%3FsessionId%3D1'),
      })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].text).toContain('Bạn đã đặt lịch tập thành công.')
    expect(body.messages[0].quickReply.items[0].action.label).toBe('Xem chi tiết')
  })

  it('uses Japanese training templates when LINE_MESSAGE_LOCALE is ja', async () => {
    env.LINE_MESSAGE_LOCALE = 'ja'
    mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())

    await expect(service.safePushTrainingSessionEvent('reminder', 1n)).resolves.toBe(true)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].text).toContain('トレーニング開始まであと30分です。')
    expect(body.messages[0].quickReply.items[0].action.label).toBe('詳細を見る')
    expect(body.messages[0].quickReply.items[0].action.uri).toContain(
      'redirect=%2Fmember%2Fworkout%2Fsessions%3FsessionId%3D1'
    )

    mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
    await expect(service.safePushTrainingSessionEvent('starting', 1n)).resolves.toBe(true)
    const startingBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(startingBody.messages[0].text).toContain('トレーニングの時間です。')
  })

  it('returns false instead of throwing when LINE push fails unexpectedly', async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
    mockFetch.mockRejectedValue(new Error('network down'))

    await expect(service.safePushTrainingSessionEvent('updated', 1n)).resolves.toBe(false)
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

  it('creates visual Flex and Rich Menu samples only in mock mode', () => {
    env.LINE_MOCK_ENABLED = 'true'
    env.CLIENT_URL = 'http://localhost:5173'

    service.createMockSample('flex')
    service.createMockSample('rich-menu')

    expect(service.getMockMessages()).toEqual([
      expect.objectContaining({
        kind: 'rich-menu',
        payload: expect.objectContaining({ name: 'RoGym Member Menu' }),
      }),
      expect.objectContaining({
        kind: 'push',
        recipient: 'rogym-liff-mock-member',
        payload: expect.objectContaining({
          messages: [
            expect.objectContaining({ type: 'flex', altText: 'Lịch tập sắp tới tại RoGym' }),
          ],
        }),
      }),
    ])
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

  it('pushes subscription expiring reminder when member has a LINE id', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      subscriptionId: 10n,
      endDate: new Date('2026-08-19T00:00:00Z'),
      package: { name: 'Gói VIP 1 Tháng' },
      member: { user: { lineId: 'U_SUB_123' } },
    })

    await expect(service.safePushSubscriptionExpiringReminder(10n)).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('redirect=%2Fmember%2Fsubscriptions%2Fcurrent'),
      })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.to).toBe('U_SUB_123')
    expect(body.messages[0].text).toContain('Gói tập Gói VIP 1 Tháng của bạn sẽ hết hạn vào ngày mai')
    expect(body.messages[0].quickReply.items[0].action.label).toBe('Gia hạn ngay')
    expect(body.messages[0].quickReply.items[0].action.uri).toContain('redirect=%2Fmember%2Fsubscriptions%2Fcurrent')
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
    expect(body.to).toBe('U_SUB_JA')
    expect(body.messages[0].text).toContain('ご利用中のプラン「Premium Plan」は明日')
    expect(body.messages[0].quickReply.items[0].action.label).toBe('今すぐ更新')
  })

  it('returns false when subscription has no linked LINE id', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      subscriptionId: 11n,
      endDate: new Date('2026-08-19T00:00:00Z'),
      package: { name: 'Gói Cơ Bản' },
      member: { user: { lineId: null } },
    })

    await expect(service.safePushSubscriptionExpiringReminder(11n)).resolves.toBe(false)
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
})
