import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { TrainingSessionStatus } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'crypto'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'

type LineWebhookBody = {
  events?: LineWebhookEvent[]
}

type LineWebhookEvent = {
  type: 'follow' | 'unfollow' | string
  replyToken?: string
  source?: {
    type?: string
    userId?: string
  }
}

type LineMessage = {
  type: 'text'
  text: string
  quickReply?: {
    items: Array<{
      type: 'action'
      action: {
        type: 'uri'
        label: string
        uri: string
      }
    }>
  }
}

type TrainingLineEvent = 'created' | 'updated' | 'cancelled' | 'reminder'

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async handleWebhook(rawBody: Buffer, signature?: string) {
    if (!this.isMessagingEnabled()) return { data: { processedEvents: 0, enabled: false } }

    this.assertValidSignature(rawBody, signature)

    let body: LineWebhookBody
    try {
      body = JSON.parse(rawBody.toString('utf8')) as LineWebhookBody
    } catch {
      throw new BadRequestException({
        success: false,
        code: 'LINE_WEBHOOK_INVALID_JSON',
        message: 'LINE webhook body khong hop le',
      })
    }

    const events = Array.isArray(body.events) ? body.events : []
    await Promise.all(events.map((event) => this.handleEvent(event)))
    return { data: { processedEvents: events.length, enabled: true } }
  }

  async safePushTrainingSessionEvent(kind: TrainingLineEvent, sessionId: bigint) {
    try {
      return await this.pushTrainingSessionEvent(kind, sessionId)
    } catch (error) {
      this.logger.warn(
        `LINE training ${kind} push failed (sessionId=${sessionId.toString()}): ${this.describeError(error)}`
      )
      return false
    }
  }

  @Cron('* * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async sendUpcomingSessionReminders() {
    if (!this.canPushMessages()) return

    const minutes = this.getReminderMinutes()
    const target = Date.now() + minutes * 60 * 1000
    const from = new Date(target - 30 * 1000)
    const to = new Date(target + 30 * 1000)

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        deletedAt: null,
        status: TrainingSessionStatus.scheduled,
        startTime: { gte: from, lte: to },
        member: {
          user: {
            lineId: { not: null },
            deletedAt: null,
          },
        },
      },
      include: {
        member: { select: { userId: true, user: { select: { lineId: true, fullName: true } } } },
        trainer: { select: { user: { select: { fullName: true } } } },
        room: { select: { name: true } },
      },
      take: 100,
    })

    for (const session of sessions) {
      const created = await this.notifications.safeNotifyUser(session.member.userId, {
        type: 'training.reminder',
        title: 'Sap den gio tap',
        message: `Buoi tap voi PT ${session.trainer.user.fullName} se bat dau sau ${minutes} phut.`,
        resourceType: 'training_session',
        resourceId: session.sessionId.toString(),
        metadata: { trainerName: session.trainer.user.fullName, reminderMinutes: minutes },
        dedupeKey: `training:${session.sessionId.toString()}:reminder:${minutes}`,
      })
      if (created) {
        await this.safePushTrainingSessionEvent('reminder', session.sessionId)
      }
    }
  }

  private async handleEvent(event: LineWebhookEvent) {
    const lineUserId = event.source?.type === 'user' ? event.source.userId : undefined
    if (!lineUserId) return

    if (event.type === 'follow' && event.replyToken) {
      await this.replyMessage(event.replyToken, [
        this.withLiffButton(
          'Chao mung ban den voi RoGym. Bam nut ben duoi de mo ung dung hoi vien.',
          'Mo ung dung',
          '/member',
        ),
      ])
      return
    }

    if (event.type === 'unfollow') {
      const result = await this.prisma.user.updateMany({
        where: { lineId: lineUserId, deletedAt: null },
        data: { lineId: null },
      })
      if (result.count > 0) {
        this.logger.log(`LINE user ${lineUserId} unfollowed; unlinked ${result.count} app user(s)`)
      }
    }
  }

  private async pushTrainingSessionEvent(kind: TrainingLineEvent, sessionId: bigint) {
    if (!this.canPushMessages()) return false

    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId, deletedAt: null },
      include: {
        member: { select: { userId: true, user: { select: { lineId: true, fullName: true } } } },
        trainer: { select: { user: { select: { fullName: true } } } },
        room: { select: { name: true } },
      },
    })
    if (!session?.member.user.lineId) return false
    if (kind === 'reminder' && session.status !== TrainingSessionStatus.scheduled) return false

    return this.pushMessage(session.member.user.lineId, [
      this.withLiffButton(
        this.buildTrainingText(kind, {
          trainerName: session.trainer.user.fullName,
          roomName: session.room.name,
          startTime: session.startTime,
          reminderMinutes: this.getReminderMinutes(),
        }),
        kind === 'cancelled' ? 'Xem lich' : kind === 'updated' ? 'Xem chi tiet' : 'Xem lich tap',
        `/member/workout/session/${session.sessionId.toString()}`,
      ),
    ])
  }

  private buildTrainingText(
    kind: TrainingLineEvent,
    session: { trainerName: string; roomName: string; startTime: Date; reminderMinutes: number },
  ) {
    const when = this.formatDateTimeVN(session.startTime)
    if (kind === 'created') {
      return `Ban da dat lich tap thanh cong.\nThoi gian: ${when}\nPT: ${session.trainerName}\nPhong: ${session.roomName}`
    }
    if (kind === 'updated') {
      return `Lich tap cua ban da duoc cap nhat.\nThoi gian moi: ${when}\nPT: ${session.trainerName}\nPhong: ${session.roomName}`
    }
    if (kind === 'cancelled') {
      return `Lich tap voi PT ${session.trainerName} vao ${when} da bi huy.`
    }
    return `Buoi tap cua ban se bat dau sau ${session.reminderMinutes} phut.\nThoi gian: ${when}\nPT: ${session.trainerName}\nPhong: ${session.roomName}`
  }

  private withLiffButton(text: string, label: string, redirectPath: string): LineMessage {
    return {
      type: 'text',
      text,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label,
              uri: this.buildLiffUrl(redirectPath),
            },
          },
        ],
      },
    }
  }

  private buildLiffUrl(redirectPath: string) {
    const base =
      this.config.get<string>('LINE_LIFF_URL') ??
      `${this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173'}/liff`
    const url = new URL(base)
    url.searchParams.set('redirect', redirectPath)
    return url.toString()
  }

  private async replyMessage(replyToken: string, messages: LineMessage[]) {
    return this.postLine('reply', { replyToken, messages })
  }

  private async pushMessage(to: string, messages: LineMessage[]) {
    return this.postLine('push', { to, messages })
  }

  private async postLine(endpoint: 'reply' | 'push', body: unknown) {
    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN')
    if (!this.isMessagingEnabled() || !token) return false

    const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '<no body>')
      this.logger.warn(`LINE ${endpoint} failed (${res.status}): ${detail}`)
      return false
    }
    return true
  }

  private assertValidSignature(rawBody: Buffer, signature?: string) {
    const secret = this.config.get<string>('LINE_CHANNEL_SECRET')
    if (!secret || !signature) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_WEBHOOK_SIGNATURE_REQUIRED',
        message: 'LINE webhook signature khong hop le',
      })
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_WEBHOOK_SIGNATURE_INVALID',
        message: 'LINE webhook signature khong hop le',
      })
    }
  }

  private isMessagingEnabled() {
    return this.config.get<string>('LINE_MESSAGING_ENABLED') === 'true'
  }

  private canPushMessages() {
    return this.isMessagingEnabled() && !!this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN')
  }

  private getReminderMinutes() {
    const value = this.config.get<number>('LINE_REMINDER_MINUTES') ?? 30
    return Number.isFinite(value) && value > 0 ? value : 30
  }

  private formatDateTimeVN(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value)
  }

  private describeError(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
  }
}
