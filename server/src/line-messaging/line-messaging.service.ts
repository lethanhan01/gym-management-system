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

type TrainingLineEvent = 'created' | 'updated' | 'cancelled' | 'reminder' | 'starting'
type LineMessageLocale = 'vi' | 'ja'

const LINE_MESSAGE_TEMPLATES: Record<
  LineMessageLocale,
  {
    dateLocale: string
    detailButton: string
    followText: string
    followButton: string
    attendanceCheckin: string
    training: Record<
      TrainingLineEvent,
      (session: {
        trainerName: string
        roomName: string
        when: string
        reminderMinutes: number
      }) => string
    >
  }
> = {
  vi: {
    dateLocale: 'vi-VN',
    detailButton: 'Xem chi tiết',
    followText: 'Chào mừng bạn đến với RoGym. Bấm nút bên dưới để mở ứng dụng hội viên.',
    followButton: 'Mở ứng dụng',
    attendanceCheckin: 'Bạn đã check-in thành công tại RoGym.',
    training: {
      created: ({ trainerName, roomName, when }) =>
        `Bạn đã đặt lịch tập thành công.\nThời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      updated: ({ trainerName, roomName, when }) =>
        `Lịch tập của bạn đã được cập nhật.\nThời gian mới: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      cancelled: ({ trainerName, when }) => `Lịch tập với PT ${trainerName} vào ${when} đã bị hủy.`,
      reminder: ({ trainerName, roomName, when, reminderMinutes }) =>
        `Buổi tập của bạn sẽ bắt đầu sau ${reminderMinutes} phút.\nThời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      starting: ({ trainerName, roomName, when }) =>
        `Đến giờ tập của bạn.\nThời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
    },
  },
  ja: {
    dateLocale: 'ja-JP',
    detailButton: '詳細を見る',
    followText: 'RoGymへようこそ。下のボタンから会員アプリを開いてください。',
    followButton: 'アプリを開く',
    attendanceCheckin: 'RoGymでのチェックインが完了しました。',
    training: {
      created: ({ trainerName, roomName, when }) =>
        `トレーニング予約が完了しました。\n日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      updated: ({ trainerName, roomName, when }) =>
        `トレーニング予約が更新されました。\n新しい日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      cancelled: ({ trainerName, when }) =>
        `PT ${trainerName} との ${when} のトレーニング予約はキャンセルされました。`,
      reminder: ({ trainerName, roomName, when, reminderMinutes }) =>
        `トレーニング開始まであと${reminderMinutes}分です。\n日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      starting: ({ trainerName, roomName, when }) =>
        `トレーニング開始時間です。\n日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
    },
  },
}

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
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

  async safePushAttendanceCheckin(attendanceId: bigint) {
    try {
      return await this.pushAttendanceCheckin(attendanceId)
    } catch (error) {
      this.logger.warn(
        `LINE attendance check-in push failed (attendanceId=${attendanceId.toString()}): ${this.describeError(error)}`
      )
      return false
    }
  }

  @Cron('* * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async sendUpcomingSessionReminders() {
    await this.sendSessionReminder(this.getReminderMinutes(), 'reminder')
    await this.sendSessionReminder(0, 'starting')
  }

  private async sendSessionReminder(
    reminderMinutes: number,
    kind: Extract<TrainingLineEvent, 'reminder' | 'starting'>
  ) {
    const target = Date.now() + reminderMinutes * 60 * 1000
    const from = new Date(target - 30 * 1000)
    const to = new Date(target + 30 * 1000)

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        deletedAt: null,
        status: TrainingSessionStatus.scheduled,
        startTime: { gte: from, lte: to },
        member: {
          user: {
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
        type: kind === 'reminder' ? 'training.reminder' : 'training.starting',
        title: kind === 'reminder' ? 'Sap den gio tap' : 'Den gio tap',
        message:
          kind === 'reminder'
            ? `Buoi tap voi PT ${session.trainer.user.fullName} se bat dau sau ${reminderMinutes} phut.`
            : `Buoi tap voi PT ${session.trainer.user.fullName} bat dau ngay bay gio.`,
        resourceType: 'training_session',
        resourceId: session.sessionId.toString(),
        metadata: { trainerName: session.trainer.user.fullName, reminderMinutes },
        dedupeKey:
          kind === 'reminder'
            ? `training:${session.sessionId.toString()}:reminder:${reminderMinutes}`
            : `training:${session.sessionId.toString()}:starting`,
      })
      if (created) {
        await this.safePushTrainingSessionEvent(kind, session.sessionId)
      }
    }
  }

  private async handleEvent(event: LineWebhookEvent) {
    const lineUserId = event.source?.type === 'user' ? event.source.userId : undefined
    if (!lineUserId) return

    if (event.type === 'follow' && event.replyToken) {
      const template = this.getMessageTemplate()
      await this.replyMessage(event.replyToken, [
        this.withLiffButton(template.followText, template.followButton, '/member'),
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
        this.getMessageTemplate().detailButton,
        this.buildTrainingRedirect(session.sessionId)
      ),
    ])
  }

  private async pushAttendanceCheckin(attendanceId: bigint) {
    if (!this.canPushMessages()) return false

    const attendance = await this.prisma.attendanceLog.findFirst({
      where: { attendanceId },
      include: {
        member: { select: { user: { select: { lineId: true } } } },
      },
    })
    if (!attendance?.member.user.lineId) return false

    return this.pushMessage(attendance.member.user.lineId, [
      this.withLiffButton(
        this.getMessageTemplate().attendanceCheckin,
        this.getMessageTemplate().detailButton,
        '/member/attendance'
      ),
    ])
  }

  private buildTrainingText(
    kind: TrainingLineEvent,
    session: { trainerName: string; roomName: string; startTime: Date; reminderMinutes: number }
  ) {
    const template = this.getMessageTemplate()
    const when = this.formatDateTime(session.startTime, template.dateLocale)
    return template.training[kind]({ ...session, when })
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
    const base = this.config.get<string>('LINE_LIFF_URL')
    if (!base) throw new Error('LINE_LIFF_URL is required when LINE messaging is enabled')
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
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
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
    return (
      this.isMessagingEnabled() &&
      !!this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN') &&
      !!this.config.get<string>('LINE_LIFF_URL')
    )
  }

  private getReminderMinutes() {
    const value = this.config.get<number>('LINE_REMINDER_MINUTES') ?? 30
    return Number.isFinite(value) && value > 0 ? value : 30
  }

  private buildTrainingRedirect(sessionId: bigint) {
    return `/member/workout/sessions?sessionId=${sessionId.toString()}`
  }

  private getMessageTemplate() {
    const locale = this.config.get<string>('LINE_MESSAGE_LOCALE')
    return LINE_MESSAGE_TEMPLATES[locale === 'ja' ? 'ja' : 'vi']
  }

  private formatDateTime(value: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, {
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
