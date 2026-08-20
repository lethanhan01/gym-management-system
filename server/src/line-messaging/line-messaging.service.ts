import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { TrainingSessionStatus } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'crypto'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { LINE_MOCK_USER_ID, LINE_MOCK_WEBHOOK_SECRET } from '../line-mock/constants'

type LineWebhookBody = {
  events?: LineWebhookEvent[]
}

type LineWebhookEvent = {
  type: 'follow' | 'unfollow' | 'message' | string
  replyToken?: string
  source?: {
    type?: string
    userId?: string
  }
  message?: { type: string; text?: string }
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

export type LineMockOutboxMessage = {
  id: string
  kind: 'reply' | 'push' | 'rich-menu' | 'unsend'
  createdAt: string
  recipient?: string
  payload: Record<string, unknown>
  liffUrl?: string
}

export type LineMockSample =
  | 'flex'
  | 'rich-menu'
  | 'pt-booking-created'
  | 'pt-reminder-30m'
  | 'pt-session-cancelled'

type TrainingLineEvent = 'created' | 'updated' | 'cancelled' | 'reminder' | 'starting'
type LineMessageLocale = 'vi' | 'ja'

const LINE_MESSAGE_TEMPLATES: Record<
  LineMessageLocale,
  {
    dateLocale: string
    detailButton: string
    renewButton: string
    followText: string
    followButton: string
    helpText: string
    helpButton: string
    attendanceCheckin: string
    subscriptionExpiring: (data: { packageName: string; endDate: string }) => string
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
    renewButton: 'Gia hạn ngay',
    followText: 'Chào mừng bạn đến với RoGym. Bấm nút bên dưới để mở ứng dụng hội viên.',
    followButton: 'Mở ứng dụng',
    helpText:
      'Xin chào! RoGym không hỗ trợ trả lời tin nhắn trực tiếp. Bấm nút bên dưới để mở ứng dụng hội viên.',
    helpButton: 'Mở ứng dụng',
    attendanceCheckin: 'Bạn đã check-in thành công tại RoGym.',
    subscriptionExpiring: ({ packageName, endDate }) =>
      `Gói tập ${packageName} của bạn sẽ hết hạn vào ngày mai (${endDate}). Vui lòng gia hạn để tiếp tục sử dụng dịch vụ tại RoGym.`,
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
    renewButton: '今すぐ更新',
    followText: 'RoGymへようこそ。下のボタンから会員アプリを開いてください。',
    followButton: 'アプリを開く',
    helpText:
      'こんにちは！RoGymは自動返信に対応していません。下のボタンから会員アプリを開いてください。',
    helpButton: 'アプリを開く',
    attendanceCheckin: 'RoGymでのチェックインが完了しました。',
    subscriptionExpiring: ({ packageName, endDate }) =>
      `ご利用中のプラン「${packageName}」は明日（${endDate}）に有効期限が切れます。継続してご利用いただくには更新手続きをお願いいたします。`,
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
        `トレーニングの時間です。\n日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
    },
  },
}

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name)
  private readonly mockOutbox: LineMockOutboxMessage[] = []

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

  isMockEnabled() {
    return this.config.get<string>('LINE_MOCK_ENABLED') === 'true'
  }

  getMockMessages() {
    this.assertMockEnabled()
    return [...this.mockOutbox].reverse()
  }

  clearMockMessages() {
    this.assertMockEnabled()
    this.mockOutbox.length = 0
  }

  createMockSample(type: LineMockSample, locale: LineMessageLocale = 'vi') {
    this.assertMockEnabled()
    const targetLocale = locale === 'ja' ? 'ja' : 'vi'
    const template = LINE_MESSAGE_TEMPLATES[targetLocale]

    if (type === 'flex') {
      const liffUrl = this.buildLiffUrl('/member/workout/sessions')
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [
            {
              type: 'flex',
              altText:
                targetLocale === 'ja' ? 'RoGymでの次のトレーニング' : 'Lịch tập sắp tới tại RoGym',
              contents: {
                type: 'bubble',
                header: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: 'ROGYM', weight: 'bold', color: '#16a34a', size: 'sm' },
                  ],
                },
                body: {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: targetLocale === 'ja' ? 'PTセッション' : 'Buổi tập với PT',
                      weight: 'bold',
                      size: 'xl',
                      wrap: true,
                    },
                    {
                      type: 'text',
                      text:
                        targetLocale === 'ja'
                          ? '本日 18:00 · Room A'
                          : 'Hôm nay, 18:00 · Room A',
                      color: '#6b7280',
                      wrap: true,
                    },
                    { type: 'separator' },
                    {
                      type: 'text',
                      text:
                        targetLocale === 'ja'
                          ? 'トレーニングの準備をしましょう。'
                          : 'Chuẩn bị sẵn sàng cho buổi tập của bạn.',
                      size: 'sm',
                      wrap: true,
                    },
                  ],
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'button',
                      style: 'primary',
                      action: {
                        type: 'uri',
                        label: targetLocale === 'ja' ? 'スケジュールを見る' : 'Xem lịch tập',
                        uri: liffUrl,
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      })
      return
    }

    if (type === 'rich-menu') {
      this.addMockOutbox({
        kind: 'rich-menu',
        payload: {
          size: { width: 2500, height: 843 },
          selected: true,
          name: 'RoGym Member Menu',
          chatBarText: targetLocale === 'ja' ? 'RoGymメニュー' : 'Mở menu RoGym',
          areas: [
            this.richMenuArea(
              0,
              targetLocale === 'ja' ? 'スケジュール' : 'Lịch tập',
              this.buildLiffUrl('/member/workout/sessions')
            ),
            this.richMenuArea(
              625,
              targetLocale === 'ja' ? 'PT予約' : 'Đặt lịch',
              this.buildLiffUrl('/member/workout/sessions?book=1')
            ),
            this.richMenuArea(
              1250,
              targetLocale === 'ja' ? 'チェックイン' : 'Check-in',
              this.buildLiffUrl('/member/attendance')
            ),
            this.richMenuArea(
              1875,
              targetLocale === 'ja' ? 'マイページ' : 'Hồ sơ',
              this.buildLiffUrl('/member/profile')
            ),
          ],
        },
      })
      return
    }

    if (type === 'pt-booking-created') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const text = template.training.created({
        trainerName: 'Coach Alex',
        roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
        when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        reminderMinutes: 30,
      })
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [
            {
              type: 'text',
              text,
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: template.detailButton,
                      uri: liffUrl,
                    },
                  },
                ],
              },
            },
          ],
        },
      })
      return
    }

    if (type === 'pt-reminder-30m') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const text = template.training.reminder({
        trainerName: 'Coach Alex',
        roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
        when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        reminderMinutes: 30,
      })
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [
            {
              type: 'text',
              text,
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: template.detailButton,
                      uri: liffUrl,
                    },
                  },
                ],
              },
            },
          ],
        },
      })
      return
    }

    if (type === 'pt-session-cancelled') {
      const liffUrl = this.buildLiffUrl('/member/workout/sessions')
      const text = template.training.cancelled({
        trainerName: 'Coach Alex',
        roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
        when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        reminderMinutes: 0,
      })
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [
            {
              type: 'text',
              text,
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: template.detailButton,
                      uri: liffUrl,
                    },
                  },
                ],
              },
            },
          ],
        },
      })
      return
    }
  }

  async simulateMockEvent(type: 'follow' | 'unfollow') {
    this.assertMockEnabled()
    const event: LineWebhookEvent = {
      type,
      source: { type: 'user', userId: LINE_MOCK_USER_ID },
      ...(type === 'follow' ? { replyToken: `mock-reply-${Date.now()}` } : {}),
    }
    const body = Buffer.from(JSON.stringify({ events: [event] }))
    const signature = createHmac('sha256', LINE_MOCK_WEBHOOK_SECRET).update(body).digest('base64')
    return this.handleWebhook(body, signature)
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

  async safePushSubscriptionExpiringReminder(subscriptionId: bigint) {
    try {
      return await this.pushSubscriptionExpiringReminder(subscriptionId)
    } catch (error) {
      this.logger.warn(
        `LINE subscription expiring reminder push failed (subscriptionId=${subscriptionId.toString()}): ${this.describeError(error)}`
      )
      return false
    }
  }

  async safeAssignRichMenu(lineUserId: string): Promise<boolean> {
    try {
      return await this.assignRichMenu(lineUserId)
    } catch (error) {
      this.logger.warn(
        `LINE Rich Menu assignment failed for user ${lineUserId}: ${this.describeError(error)}`
      )
      return false
    }
  }

  async assignRichMenu(lineUserId: string): Promise<boolean> {
    if (!lineUserId) return false

    const richMenuId = this.config.get<string>('LINE_RICH_MENU_ID')
    if (!richMenuId) return false

    if (this.isMockEnabled()) {
      this.addMockOutbox({
        kind: 'rich-menu',
        recipient: lineUserId,
        payload: { userId: lineUserId, richMenuId },
      })
      return true
    }

    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN')
    if (!this.isMessagingEnabled() || !token) return false

    const res = await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '<no body>')
      this.logger.warn(`LINE assign rich menu failed (${res.status}): ${detail}`)
      return false
    }
    return true
  }

  async safeUnsend(messageId: string): Promise<boolean> {
    try {
      return await this.unsend(messageId)
    } catch (error) {
      this.logger.warn(
        `LINE unsend failed (messageId=${messageId}): ${this.describeError(error)}`
      )
      return false
    }
  }

  async unsend(messageId: string): Promise<boolean> {
    if (!messageId) {
      throw new BadRequestException({
        success: false,
        code: 'LINE_UNSEND_MESSAGE_ID_REQUIRED',
        message: 'messageId khong duoc de rong',
      })
    }

    if (this.isMockEnabled()) {
      this.addMockOutbox({
        kind: 'unsend',
        recipient: 'system',
        payload: { messageId },
      })
      return true
    }

    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN')
    if (!this.isMessagingEnabled() || !token) return false

    const res = await fetch('https://api.line.me/v2/bot/message/unsend', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '<no body>')
      this.logger.warn(`LINE unsend failed (${res.status}): ${detail}`)
      return false
    }
    return true
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
      await this.safeAssignRichMenu(lineUserId)
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
      return
    }

    if (event.type === 'message' && event.replyToken) {
      const template = this.getMessageTemplate()
      await this.replyMessage(event.replyToken, [
        this.withLiffButton(template.helpText, template.helpButton, '/member'),
      ])
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

  private async pushSubscriptionExpiringReminder(subscriptionId: bigint) {
    if (!this.canPushMessages()) return false

    const subscription = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: {
        package: { select: { name: true } },
        member: { select: { user: { select: { lineId: true } } } },
      },
    })
    if (!subscription?.member.user.lineId) return false

    const template = this.getMessageTemplate()
    const endDateFormatted = this.formatDate(subscription.endDate, template.dateLocale)
    const text = template.subscriptionExpiring({
      packageName: subscription.package?.name ?? 'Gói tập',
      endDate: endDateFormatted,
    })

    return this.pushMessage(subscription.member.user.lineId, [
      this.withLiffButton(text, template.renewButton, '/member/subscription/current'),
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
    if (this.isMockEnabled()) {
      const url = new URL('/liff', this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173')
      url.searchParams.set('redirect', redirectPath)
      return url.toString()
    }

    const base = this.config.get<string>('LINE_LIFF_URL')
    if (!base) throw new Error('LINE_LIFF_URL is required when LINE messaging is enabled')
    const url = new URL(base)
    url.searchParams.set('liff.state', `?redirect=${encodeURIComponent(redirectPath)}`)
    return url.toString()
  }

  private async replyMessage(replyToken: string, messages: LineMessage[]) {
    return this.postLine('reply', { replyToken, messages })
  }

  private async pushMessage(to: string, messages: LineMessage[]) {
    return this.postLine('push', { to, messages })
  }

  private async postLine(endpoint: 'reply' | 'push', body: unknown) {
    if (this.isMockEnabled()) {
      const payload = JSON.parse(JSON.stringify(body)) as Record<string, unknown>
      this.addMockOutbox({
        kind: endpoint,
        recipient: this.getMockRecipient(endpoint, payload),
        payload,
        liffUrl: this.findLiffUrl(payload),
      })
      return true
    }

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
    const secret = this.isMockEnabled()
      ? LINE_MOCK_WEBHOOK_SECRET
      : this.config.get<string>('LINE_CHANNEL_SECRET')
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
    return this.isMockEnabled() || this.config.get<string>('LINE_MESSAGING_ENABLED') === 'true'
  }

  private canPushMessages() {
    if (this.isMockEnabled()) return true
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

  private formatDate(value: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value)
  }

  private describeError(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
  }

  private assertMockEnabled() {
    if (!this.isMockEnabled()) {
      throw new Error('LINE Mock is disabled')
    }
  }

  private getMockRecipient(endpoint: 'reply' | 'push', payload: Record<string, unknown>) {
    const key = endpoint === 'reply' ? 'replyToken' : 'to'
    return typeof payload[key] === 'string' ? payload[key] : 'unknown'
  }

  private addMockOutbox(entry: Omit<LineMockOutboxMessage, 'id' | 'createdAt'>) {
    this.mockOutbox.push({
      id: `${Date.now()}-${this.mockOutbox.length + 1}`,
      createdAt: new Date().toISOString(),
      ...entry,
    })
  }

  private richMenuArea(x: number, label: string, uri: string) {
    return {
      bounds: { x, y: 0, width: 625, height: 843 },
      action: { type: 'uri', label, uri },
    }
  }

  private findLiffUrl(payload: Record<string, unknown>): string | undefined {
    const messages = payload.messages
    if (!Array.isArray(messages)) return undefined
    for (const message of messages) {
      const items = (message as { quickReply?: { items?: unknown[] } }).quickReply?.items
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const uri = (item as { action?: { uri?: unknown } }).action?.uri
        if (typeof uri === 'string') return uri
      }
    }
    return undefined
  }
}
