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

const env: Record<string, unknown> = {
  LINE_MESSAGING_ENABLED: 'true',
  LINE_CHANNEL_SECRET: 'secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'token',
  LINE_LIFF_URL: 'https://liff.line.me/test-liff',
  LINE_REMINDER_MINUTES: 30,
}

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
    service = new LineMessagingService(mockPrisma as any, mockConfig as any, mockNotifications as any)
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
      expect.objectContaining({ body: expect.stringContaining('%2Fmember%2Fworkout%2Fsession%2F1') })
    )
  })

  it('does not push duplicate reminders when notification dedupe skips the row', async () => {
    mockPrisma.trainingSession.findMany.mockResolvedValue([makeSession()])
    mockNotifications.safeNotifyUser.mockResolvedValue(false)

    await service.sendUpcomingSessionReminders()

    expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
      100n,
      expect.objectContaining({ dedupeKey: 'training:1:reminder:30' })
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
