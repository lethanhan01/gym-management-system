import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { createHmac } from 'crypto'
import express from 'express'
import type { Request as ExpressRequest } from 'express'
import request from 'supertest'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { LineMessagingController } from './line-messaging.controller'
import { LineMessagingService } from './line-messaging.service'

function sign(body: Buffer, secret = 'secret') {
  return createHmac('sha256', secret).update(body).digest('base64')
}

const env: Record<string, unknown> = {
  LINE_MESSAGING_ENABLED: 'true',
  LINE_CHANNEL_SECRET: 'secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'token',
  LINE_LIFF_URL: 'https://liff.line.me/test-liff',
  LINE_REMINDER_MINUTES: 30,
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

const mockConfig = {
  get: jest.fn((key: string) => env[key]),
}

const mockNotifications = {
  safeNotifyUser: jest.fn(),
}

async function createWebhookApp(mode: 'raw' | 'parsed'): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [LineMessagingController],
    providers: [
      LineMessagingService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: ConfigService, useValue: mockConfig },
      { provide: NotificationsService, useValue: mockNotifications },
    ],
  }).compile()

  const app =
    mode === 'raw'
      ? module.createNestApplication({ bodyParser: false })
      : module.createNestApplication()

  if (mode === 'raw') {
    app.use('/api/v1/line/webhook', express.raw({ type: 'application/json' }))
    app.use(express.json())
  }

  app.setGlobalPrefix('api/v1')
  await app.init()
  return app
}

describe('LineMessagingController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfig.get.mockImplementation((key: string) => env[key])
  })

  it('passes the raw Buffer body and signature to the service', async () => {
    const lineMessaging = {
      handleWebhook: jest.fn().mockResolvedValue({ data: { processedEvents: 0, enabled: true } }),
    }
    const controller = new LineMessagingController(lineMessaging as unknown as LineMessagingService)
    const body = Buffer.from(JSON.stringify({ events: [] }))

    await expect(controller.webhook({ body } as ExpressRequest, sign(body))).resolves.toEqual({
      success: true,
      data: { processedEvents: 0, enabled: true },
    })

    expect(lineMessaging.handleWebhook).toHaveBeenCalledWith(body, sign(body))
  })

  it('rejects parsed bodies before calling the service', async () => {
    const lineMessaging = {
      handleWebhook: jest.fn(),
    }
    const controller = new LineMessagingController(lineMessaging as unknown as LineMessagingService)

    await expect(
      controller.webhook({ body: { events: [] } } as ExpressRequest, 'signature')
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'LINE_WEBHOOK_RAW_BODY_REQUIRED' }),
    })

    expect(lineMessaging.handleWebhook).not.toHaveBeenCalled()
  })

  it('accepts a real HTTP webhook request with raw body and valid signature', async () => {
    const app = await createWebhookApp('raw')
    const bodyText = JSON.stringify({ events: [] })
    const body = Buffer.from(bodyText)

    const res = await request(app.getHttpServer())
      .post('/api/v1/line/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', sign(body))
      .send(bodyText)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      success: true,
      data: { processedEvents: 0, enabled: true },
    })

    await app.close()
  })

  it('rejects a real HTTP webhook request with raw body and invalid signature', async () => {
    const app = await createWebhookApp('raw')
    const bodyText = JSON.stringify({ events: [] })

    const res = await request(app.getHttpServer())
      .post('/api/v1/line/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', 'bad-signature')
      .send(bodyText)

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('LINE webhook signature khong hop le')

    await app.close()
  })

  it('rejects HTTP webhook requests when JSON middleware parsed the body first', async () => {
    const app = await createWebhookApp('parsed')
    const bodyText = JSON.stringify({ events: [] })
    const body = Buffer.from(bodyText)

    const res = await request(app.getHttpServer())
      .post('/api/v1/line/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', sign(body))
      .send(bodyText)

    expect(res.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ code: 'LINE_WEBHOOK_RAW_BODY_REQUIRED' }))

    await app.close()
  })
})
