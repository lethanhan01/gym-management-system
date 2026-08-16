import { UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'crypto'
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
    expect(startingBody.messages[0].text).toContain('トレーニング開始時間です。')
  })

  it('returns false instead of throwing when LINE push fails unexpectedly', async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
    mockFetch.mockRejectedValue(new Error('network down'))

    await expect(service.safePushTrainingSessionEvent('updated', 1n)).resolves.toBe(false)
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
})
