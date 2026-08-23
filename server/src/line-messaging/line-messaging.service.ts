import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { TrainingSessionStatus } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'crypto'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { LINE_MOCK_USER_ID, LINE_MOCK_WEBHOOK_SECRET } from '../line-mock/constants'
import {
  buildAttendanceCheckinFlex,
  buildFeedbackRespondedFlex,
  buildHelpAutoReplyFlex,
  buildPaymentSuccessFlex,
  buildSubscriptionExpiringFlex,
  buildTrainingBookingCancelledFlex,
  buildTrainingBookingCreatedFlex,
  buildTrainingBookingUpdatedFlex,
  buildTrainingCompletedFlex,
  buildTrainingReminderFlex,
  buildTrainingStartingFlex,
  buildWelcomeFlex,
  formatAmount,
  LineFlexMessage,
  LineMessageLocale,
} from './line-flex-builder'

export { LineMessageLocale }

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

export type LineMessage =
  | {
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
  | LineFlexMessage

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
  | 'pt-booking-updated'
  | 'pt-booking-cancelled'
  | 'pt-session-cancelled'
  | 'pt-reminder-30m'
  | 'pt-session-starting'
  | 'pt-training-completed'
  | 'attendance-checkin'
  | 'subscription-expiring'
  | 'payment-success'
  | 'feedback-responded'
  | 'welcome'
  | 'help'

type TrainingLineEvent = 'created' | 'updated' | 'cancelled' | 'reminder' | 'starting'

const LINE_MESSAGE_TEMPLATES: Record<
  LineMessageLocale,
  {
    dateLocale: string
    detailButton: string
    renewButton: string
    reviewButton: string
    feedbackButton: string
    followText: string
    followButton: string
    helpText: string
    helpButton: string
    attendanceCheckin: string
    subscriptionExpiring: (data: { packageName: string; endDate: string }) => string
    paymentSuccess: (data: {
      packageName: string
      amount: string
      paymentMethod?: string
      paymentCode?: string
    }) => string
    trainingCompleted: (data: { trainerName: string; sessionName?: string }) => string
    feedbackResponded: (data: { feedbackTitle?: string }) => string
    training: Record<
      TrainingLineEvent,
      (session: {
        trainerName: string
        roomName: string
        when: string
        reminderMinutes: number
        sessionName?: string
      }) => string
    >
  }
> = {
  vi: {
    dateLocale: 'vi-VN',
    detailButton: 'Xem chi tiết',
    renewButton: 'Gia hạn ngay',
    reviewButton: 'Đánh giá PT',
    feedbackButton: 'Xem phản hồi',
    followText: 'Chào mừng bạn đến với RoGym. Bấm nút bên dưới để mở ứng dụng hội viên.',
    followButton: 'Mở ứng dụng',
    helpText:
      'Xin chào! RoGym không hỗ trợ trả lời tin nhắn trực tiếp. Bấm nút bên dưới để mở ứng dụng hội viên.',
    helpButton: 'Mở ứng dụng',
    attendanceCheckin: 'Bạn đã check-in thành công tại RoGym.',
    subscriptionExpiring: ({ packageName, endDate }) =>
      `Gói tập ${packageName} của bạn sẽ hết hạn vào ngày mai (${endDate}). Vui lòng gia hạn để tiếp tục sử dụng dịch vụ tại RoGym.`,
    paymentSuccess: ({ packageName, amount, paymentMethod, paymentCode }) =>
      `Thanh toán thành công gói tập ${packageName}.\nSố tiền: ${amount}${
        paymentMethod ? `\nPhương thức: ${paymentMethod}` : ''
      }${paymentCode ? `\nMã GD: ${paymentCode}` : ''}`,
    trainingCompleted: ({ trainerName, sessionName }) =>
      `Buổi tập${sessionName ? ` "${sessionName}"` : ''} với PT ${trainerName} đã hoàn thành.\nCảm ơn bạn đã tập luyện cùng RoGym! Hãy dành chút thời gian đánh giá chất lượng buổi tập nhé.`,
    feedbackResponded: ({ feedbackTitle }) =>
      `Góp ý${feedbackTitle ? ` "${feedbackTitle}"` : ''} của bạn đã nhận được phản hồi từ Ban quản lý RoGym.`,
    training: {
      created: ({ trainerName, roomName, when, sessionName }) =>
        `Bạn đã đặt lịch tập thành công.\n${sessionName ? `Nội dung: ${sessionName}\n` : ''}Thời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      updated: ({ trainerName, roomName, when, sessionName }) =>
        `Lịch tập của bạn đã được cập nhật.\n${sessionName ? `Nội dung mới: ${sessionName}\n` : ''}Thời gian mới: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      cancelled: ({ trainerName, when, sessionName }) =>
        `Lịch tập${sessionName ? ` "${sessionName}"` : ''} với PT ${trainerName} vào ${when} đã bị hủy.`,
      reminder: ({ trainerName, roomName, when, reminderMinutes, sessionName }) =>
        `Buổi tập của bạn sẽ bắt đầu sau ${reminderMinutes} phút.\n${sessionName ? `Nội dung: ${sessionName}\n` : ''}Thời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
      starting: ({ trainerName, roomName, when, sessionName }) =>
        `Đến giờ tập của bạn.\n${sessionName ? `Nội dung: ${sessionName}\n` : ''}Thời gian: ${when}\nPT: ${trainerName}\nPhòng: ${roomName}`,
    },
  },
  ja: {
    dateLocale: 'ja-JP',
    detailButton: '詳細を見る',
    renewButton: '今すぐ更新',
    reviewButton: 'PTを評価',
    feedbackButton: '返答を確認',
    followText: 'RoGymへようこそ。下のボタンから会員アプリを開いてください。',
    followButton: 'アプリを開く',
    helpText:
      'こんにちは！RoGymは自動返信に対応していません。下のボタンから会員アプリを開いてください。',
    helpButton: 'アプリを開く',
    attendanceCheckin: 'RoGymでのチェックインが完了しました。',
    subscriptionExpiring: ({ packageName, endDate }) =>
      `ご利用中のプラン「${packageName}」は明日（${endDate}）に有効期限が切れます。継続してご利用いただくには更新手続きをお願いいたします。`,
    paymentSuccess: ({ packageName, amount, paymentMethod, paymentCode }) =>
      `プラン「${packageName}」のお支払いが完了しました。\nお支払い金額: ${amount}${
        paymentMethod ? `\nお支払い方法: ${paymentMethod}` : ''
      }${paymentCode ? `\n決済番号: ${paymentCode}` : ''}`,
    trainingCompleted: ({ trainerName, sessionName }) =>
      `PT ${trainerName} とのトレーニングセッション${sessionName ? `（${sessionName}）` : ''}が完了しました。\nRoGymをご利用いただきありがとうございます！セッションの評価にご協力ください。`,
    feedbackResponded: ({ feedbackTitle }) =>
      `ご意見${feedbackTitle ? `「${feedbackTitle}」` : ''}への返答がRoGym管理者より届きました。`,
    training: {
      created: ({ trainerName, roomName, when, sessionName }) =>
        `トレーニング予約が完了しました。\n${sessionName ? `内容: ${sessionName}\n` : ''}日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      updated: ({ trainerName, roomName, when, sessionName }) =>
        `トレーニング予約が更新されました。\n${sessionName ? `新しい内容: ${sessionName}\n` : ''}新しい日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      cancelled: ({ trainerName, when, sessionName }) =>
        `PT ${trainerName} との ${when} のトレーニング予約${sessionName ? `（${sessionName}）` : ''}はキャンセルされました。`,
      reminder: ({ trainerName, roomName, when, reminderMinutes, sessionName }) =>
        `トレーニング開始まであと${reminderMinutes}分です。\n${sessionName ? `内容: ${sessionName}\n` : ''}日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
      starting: ({ trainerName, roomName, when, sessionName }) =>
        `トレーニングの時間です。\n${sessionName ? `内容: ${sessionName}\n` : ''}日時: ${when}\nPT: ${trainerName}\nルーム: ${roomName}`,
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

  createMockSample(type: LineMockSample, locale?: LineMessageLocale) {
    this.assertMockEnabled()
    const targetLocale: LineMessageLocale = locale ?? this.getLocale()

    if (type === 'flex' || type === 'pt-booking-created') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const flexMsg = buildTrainingBookingCreatedFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          trainerName: 'Coach Alex',
          roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
          when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'pt-booking-updated') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const flexMsg = buildTrainingBookingUpdatedFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          trainerName: 'Coach Alex',
          roomName: targetLocale === 'ja' ? 'VIP Studio 02' : 'Phòng VIP Studio 02',
          when: targetLocale === 'ja' ? '2026/08/21 10:30' : '10:30 21/08/2026',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'pt-booking-cancelled' || type === 'pt-session-cancelled') {
      const liffUrl = this.buildLiffUrl('/member/workout/sessions')
      const flexMsg = buildTrainingBookingCancelledFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          trainerName: 'Coach Alex',
          when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'pt-reminder-30m') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const flexMsg = buildTrainingReminderFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          trainerName: 'Coach Alex',
          roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
          when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
          reminderMinutes: 30,
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'pt-session-starting') {
      const mockSessionId = '101'
      const liffUrl = this.buildLiffUrl(`/member/workout/sessions?sessionId=${mockSessionId}`)
      const flexMsg = buildTrainingStartingFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          trainerName: 'Coach Alex',
          roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
          when: targetLocale === 'ja' ? '2026/08/20 09:00' : '09:00 20/08/2026',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'pt-training-completed') {
      const reviewUrl = this.buildLiffUrl('/member/feedback/new?trainerId=101')
      const historyUrl = this.buildLiffUrl('/member/workout/sessions')
      const flexMsg = buildTrainingCompletedFlex(
        {
          sessionName: targetLocale === 'ja' ? 'パーソナルトレーニング' : 'Buổi tập PT cá nhân',
          when: targetLocale === 'ja' ? '2026/08/20 10:00' : '10:00 20/08/2026',
          trainerName: 'Coach Alex',
          roomName: targetLocale === 'ja' ? 'Cardio & Weights Room 01' : 'Phòng Cardio & Tạ 01',
        },
        targetLocale,
        reviewUrl,
        historyUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl: reviewUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'attendance-checkin') {
      const liffUrl = this.buildLiffUrl('/member/attendance')
      const flexMsg = buildAttendanceCheckinFlex(
        {
          checkinTime: targetLocale === 'ja' ? '2026/08/20 08:45' : '08:45 20/08/2026',
          branchName: targetLocale === 'ja' ? 'RoGym Central Branch' : 'RoGym Chi nhánh Trung Tâm',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'subscription-expiring') {
      const renewUrl = this.buildLiffUrl('/member/profile')
      const detailUrl = this.buildLiffUrl('/member/profile')
      const flexMsg = buildSubscriptionExpiringFlex(
        {
          packageName: targetLocale === 'ja' ? 'Diamond 3ヶ月プラン' : 'Gói Diamond 3 Tháng',
          endDate: targetLocale === 'ja' ? '2026/08/25' : '25/08/2026',
        },
        targetLocale,
        renewUrl,
        detailUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl: renewUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'payment-success') {
      const liffUrl = this.buildLiffUrl('/member/profile')
      const flexMsg = buildPaymentSuccessFlex(
        {
          packageName: targetLocale === 'ja' ? 'Diamond 3ヶ月プラン' : 'Gói Diamond 3 Tháng',
          amount: targetLocale === 'ja' ? 15000 : 2500000,
          paymentMethod: targetLocale === 'ja' ? 'クレジットカード' : 'VNPay QR',
          paymentCode: 'PAY-20260820-9988',
          paidAt: targetLocale === 'ja' ? '2026/08/20 08:30' : '08:30 20/08/2026',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'feedback-responded') {
      const liffUrl = this.buildLiffUrl('/member/feedback/101')
      const flexMsg = buildFeedbackRespondedFlex(
        {
          feedbackTitle:
            targetLocale === 'ja'
              ? 'シャワールームの設備について'
              : 'Góp ý về phòng tắm nóng lạnh',
          respondedAt: targetLocale === 'ja' ? '2026/08/20 11:15' : '11:15 20/08/2026',
          responderName: targetLocale === 'ja' ? 'RoGym 管理チーム' : 'Ban quản lý RoGym',
        },
        targetLocale,
        liffUrl
      )
      this.addMockOutbox({
        kind: 'push',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          to: LINE_MOCK_USER_ID,
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'welcome') {
      const liffUrl = this.buildLiffUrl('/member')
      const flexMsg = buildWelcomeFlex(targetLocale, liffUrl)
      this.addMockOutbox({
        kind: 'reply',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          messages: [flexMsg],
        },
      })
      return
    }

    if (type === 'help') {
      const liffUrl = this.buildLiffUrl('/member')
      const flexMsg = buildHelpAutoReplyFlex(targetLocale, liffUrl)
      this.addMockOutbox({
        kind: 'reply',
        recipient: LINE_MOCK_USER_ID,
        liffUrl,
        payload: {
          messages: [flexMsg],
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

  async safePushPaymentSuccess(paymentId: bigint): Promise<boolean> {
    try {
      return await this.pushPaymentSuccess(paymentId)
    } catch (error) {
      this.logger.warn(
        `LINE payment success push failed (paymentId=${paymentId.toString()}): ${this.describeError(error)}`
      )
      return false
    }
  }

  async safePushTrainingSessionCompleted(sessionId: bigint): Promise<boolean> {
    try {
      return await this.pushTrainingSessionCompleted(sessionId)
    } catch (error) {
      this.logger.warn(
        `LINE training session completed push failed (sessionId=${sessionId.toString()}): ${this.describeError(error)}`
      )
      return false
    }
  }

  async safePushFeedbackResponded(feedbackId: bigint): Promise<boolean> {
    try {
      return await this.pushFeedbackResponded(feedbackId)
    } catch (error) {
      this.logger.warn(
        `LINE feedback responded push failed (feedbackId=${feedbackId.toString()}): ${this.describeError(error)}`
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
        planDay: { select: { name: true } },
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

    const locale = this.getLocale()

    if (event.type === 'follow' && event.replyToken) {
      let message: LineMessage
      try {
        message = buildWelcomeFlex(locale, this.buildLiffUrl('/member'))
      } catch (error) {
        this.logger.warn(
          `Flex builder failed for webhook.follow: ${this.describeError(error)}, falling back to text`
        )
        const template = this.getMessageTemplate()
        message = this.withLiffButton(template.followText, template.followButton, '/member')
      }
      await this.replyMessage(event.replyToken, [message])
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
      let message: LineMessage
      try {
        message = buildHelpAutoReplyFlex(locale, this.buildLiffUrl('/member'))
      } catch (error) {
        this.logger.warn(
          `Flex builder failed for webhook.message: ${this.describeError(error)}, falling back to text`
        )
        const template = this.getMessageTemplate()
        message = this.withLiffButton(template.helpText, template.helpButton, '/member')
      }
      await this.replyMessage(event.replyToken, [message])
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
        planDay: { select: { name: true } },
      },
    })
    if (!session?.member.user.lineId) return false
    if (kind === 'reminder' && session.status !== TrainingSessionStatus.scheduled) return false

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildTrainingFlexMessage(kind, session, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for training.${kind} (sessionId=${sessionId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildTrainingLegacyTextMessage(kind, session, locale)
    }

    return this.pushMessage(session.member.user.lineId, [message])
  }

  private buildTrainingFlexMessage(
    kind: TrainingLineEvent,
    session: {
      sessionId: bigint
      startTime: Date
      trainer: { user: { fullName: string } }
      room: { name: string }
      planDay?: { name: string } | null
    },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const when = this.formatDateTime(session.startTime, template.dateLocale)
    const sessionName = session.planDay?.name
    const trainerName = session.trainer.user.fullName
    const roomName = session.room.name
    const redirectUrl = this.buildLiffUrl(this.buildTrainingRedirect(session.sessionId))

    switch (kind) {
      case 'created':
        return buildTrainingBookingCreatedFlex(
          { sessionName, when, trainerName, roomName },
          locale,
          redirectUrl
        )
      case 'updated':
        return buildTrainingBookingUpdatedFlex(
          { sessionName, when, trainerName, roomName },
          locale,
          redirectUrl
        )
      case 'cancelled':
        return buildTrainingBookingCancelledFlex(
          { sessionName, when, trainerName },
          locale,
          this.buildLiffUrl('/member/workout/sessions')
        )
      case 'reminder':
        return buildTrainingReminderFlex(
          {
            sessionName,
            when,
            trainerName,
            roomName,
            reminderMinutes: this.getReminderMinutes(),
          },
          locale,
          redirectUrl
        )
      case 'starting':
        return buildTrainingStartingFlex(
          { sessionName, when, trainerName, roomName },
          locale,
          redirectUrl
        )
    }
  }

  private buildTrainingLegacyTextMessage(
    kind: TrainingLineEvent,
    session: {
      sessionId: bigint
      startTime: Date
      trainer: { user: { fullName: string } }
      room: { name: string }
      planDay?: { name: string } | null
    },
    locale: LineMessageLocale
  ): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    const text = this.buildTrainingText(kind, {
      trainerName: session.trainer.user.fullName,
      roomName: session.room.name,
      startTime: session.startTime,
      reminderMinutes: this.getReminderMinutes(),
      sessionName: session.planDay?.name,
    })
    const redirect =
      kind === 'cancelled'
        ? '/member/workout/sessions'
        : this.buildTrainingRedirect(session.sessionId)
    return this.withLiffButton(text, template.detailButton, redirect)
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

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildAttendanceFlexMessage(attendance, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for attendance.checkin (attendanceId=${attendanceId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildAttendanceLegacyTextMessage(locale)
    }

    return this.pushMessage(attendance.member.user.lineId, [message])
  }

  private buildAttendanceFlexMessage(
    attendance: { startTime: Date },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const checkinTime = this.formatDateTime(attendance.startTime, template.dateLocale)
    return buildAttendanceCheckinFlex(
      { checkinTime },
      locale,
      this.buildLiffUrl('/member/attendance')
    )
  }

  private buildAttendanceLegacyTextMessage(locale: LineMessageLocale): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    return this.withLiffButton(
      template.attendanceCheckin,
      template.detailButton,
      '/member/attendance'
    )
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

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildSubscriptionExpiringFlexMessage(subscription, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for subscription.expiring_soon (subscriptionId=${subscriptionId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildSubscriptionExpiringLegacyTextMessage(subscription, locale)
    }

    return this.pushMessage(subscription.member.user.lineId, [message])
  }

  private buildSubscriptionExpiringFlexMessage(
    subscription: { endDate: Date; package?: { name: string } | null },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const endDateFormatted = this.formatDate(subscription.endDate, template.dateLocale)
    return buildSubscriptionExpiringFlex(
      {
        packageName: subscription.package?.name ?? 'Gói tập',
        endDate: endDateFormatted,
      },
      locale,
      this.buildLiffUrl('/member/subscription/current'),
      this.buildLiffUrl('/member/profile')
    )
  }

  private buildSubscriptionExpiringLegacyTextMessage(
    subscription: { endDate: Date; package?: { name: string } | null },
    locale: LineMessageLocale
  ): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    const endDateFormatted = this.formatDate(subscription.endDate, template.dateLocale)
    const text = template.subscriptionExpiring({
      packageName: subscription.package?.name ?? 'Gói tập',
      endDate: endDateFormatted,
    })
    return this.withLiffButton(text, template.renewButton, '/member/subscription/current')
  }

  private async pushPaymentSuccess(paymentId: bigint): Promise<boolean> {
    if (!this.canPushMessages()) return false

    const payment = await this.prisma.payment.findFirst({
      where: { paymentId },
      include: {
        subscription: {
          include: {
            package: { select: { name: true } },
          },
        },
        member: {
          select: {
            user: { select: { lineId: true } },
          },
        },
      },
    })
    if (!payment?.member.user.lineId) return false

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildPaymentSuccessFlexMessage(payment, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for payment.success (paymentId=${paymentId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildPaymentSuccessLegacyTextMessage(payment, locale)
    }

    return this.pushMessage(payment.member.user.lineId, [message])
  }

  private buildPaymentSuccessFlexMessage(
    payment: {
      amount: { toString(): string } | number | string
      method: string
      transactionReference?: string | null
      paymentId: bigint
      paidAt?: Date | null
      subscription?: { package?: { name: string } | null } | null
    },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const packageName = payment.subscription?.package?.name ?? 'Gói tập hội viên'
    const paymentCode = payment.transactionReference || payment.paymentId.toString()
    const paidAtFormatted = payment.paidAt
      ? this.formatDateTime(payment.paidAt, template.dateLocale)
      : undefined
    return buildPaymentSuccessFlex(
      {
        packageName,
        amount: payment.amount.toString(),
        paymentMethod: payment.method,
        paymentCode,
        paidAt: paidAtFormatted,
      },
      locale,
      this.buildLiffUrl('/member/subscription/current')
    )
  }

  private buildPaymentSuccessLegacyTextMessage(
    payment: {
      amount: { toString(): string } | number | string
      method: string
      transactionReference?: string | null
      paymentId: bigint
      subscription?: { package?: { name: string } | null } | null
    },
    locale: LineMessageLocale
  ): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    const packageName = payment.subscription?.package?.name ?? 'Gói tập hội viên'
    const formattedAmount = formatAmount(payment.amount.toString(), locale)
    const text = template.paymentSuccess({
      packageName,
      amount: formattedAmount,
      paymentMethod: payment.method,
      paymentCode: payment.transactionReference || payment.paymentId.toString(),
    })
    return this.withLiffButton(text, template.detailButton, '/member/subscription/current')
  }

  private async pushTrainingSessionCompleted(sessionId: bigint): Promise<boolean> {
    if (!this.canPushMessages()) return false

    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId, deletedAt: null },
      include: {
        member: { select: { userId: true, user: { select: { lineId: true, fullName: true } } } },
        trainer: { select: { user: { select: { fullName: true } } } },
        room: { select: { name: true } },
        planDay: { select: { name: true } },
      },
    })
    if (!session?.member.user.lineId) return false

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildTrainingCompletedFlexMessage(session, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for training.completed (sessionId=${sessionId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildTrainingCompletedLegacyTextMessage(session, locale)
    }

    return this.pushMessage(session.member.user.lineId, [message])
  }

  private buildTrainingCompletedFlexMessage(
    session: {
      sessionId: bigint
      startTime: Date
      trainer: { user: { fullName: string } }
      room?: { name: string } | null
      planDay?: { name: string } | null
    },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const when = this.formatDateTime(session.startTime, template.dateLocale)
    const sessionName = session.planDay?.name
    const trainerName = session.trainer.user.fullName
    const roomName = session.room?.name
    const reviewUrl = this.buildLiffUrl('/member/feedback/send')
    const historyUrl = this.buildLiffUrl('/member/workout/sessions')

    return buildTrainingCompletedFlex(
      { sessionName, when, trainerName, roomName },
      locale,
      reviewUrl,
      historyUrl
    )
  }

  private buildTrainingCompletedLegacyTextMessage(
    session: {
      trainer: { user: { fullName: string } }
      planDay?: { name: string } | null
    },
    locale: LineMessageLocale
  ): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    const text = template.trainingCompleted({
      trainerName: session.trainer.user.fullName,
      sessionName: session.planDay?.name,
    })
    return this.withLiffButton(text, template.reviewButton, '/member/feedback/send')
  }

  private async pushFeedbackResponded(feedbackId: bigint): Promise<boolean> {
    if (!this.canPushMessages()) return false

    const feedback = await this.prisma.feedback.findFirst({
      where: { feedbackId, deletedAt: null },
      include: {
        member: { select: { user: { select: { lineId: true } } } },
        handledByStaff: { select: { user: { select: { fullName: true } } } },
      },
    })
    if (!feedback?.member.user.lineId) return false

    const locale = this.getLocale()
    let message: LineMessage

    try {
      message = this.buildFeedbackRespondedFlexMessage(feedback, locale)
    } catch (error) {
      this.logger.warn(
        `Flex builder failed for feedback.responded (feedbackId=${feedbackId.toString()}): ${this.describeError(error)}, falling back to text`
      )
      message = this.buildFeedbackRespondedLegacyTextMessage(feedback, locale)
    }

    return this.pushMessage(feedback.member.user.lineId, [message])
  }

  private buildFeedbackRespondedFlexMessage(
    feedback: {
      content: string
      handledAt?: Date | null
      resolutionNote?: string | null
      handledByStaff?: { user: { fullName: string } } | null
    },
    locale: LineMessageLocale
  ): LineFlexMessage {
    const template = this.getMessageTemplate()
    const respondedAt = feedback.handledAt
      ? this.formatDateTime(feedback.handledAt, template.dateLocale)
      : this.formatDateTime(new Date(), template.dateLocale)
    const feedbackTitle = feedback.content
      ? feedback.content.length > 30
        ? feedback.content.slice(0, 30) + '...'
        : feedback.content
      : undefined
    const responderName = feedback.handledByStaff?.user.fullName

    return buildFeedbackRespondedFlex(
      {
        feedbackTitle,
        respondedAt,
        responderName,
      },
      locale,
      this.buildLiffUrl('/member/feedback')
    )
  }

  private buildFeedbackRespondedLegacyTextMessage(
    feedback: {
      content: string
    },
    locale: LineMessageLocale
  ): LineMessage {
    const template = LINE_MESSAGE_TEMPLATES[locale]
    const feedbackTitle = feedback.content
      ? feedback.content.length > 30
        ? feedback.content.slice(0, 30) + '...'
        : feedback.content
      : undefined
    const text = template.feedbackResponded({ feedbackTitle })
    return this.withLiffButton(text, template.feedbackButton, '/member/feedback')
  }

  private buildTrainingText(
    kind: TrainingLineEvent,
    session: {
      trainerName: string
      roomName: string
      startTime: Date
      reminderMinutes: number
      sessionName?: string
    }
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

  getLocale(): LineMessageLocale {
    const locale = this.config.get<string>('LINE_MESSAGE_LOCALE')
    return locale === 'ja' ? 'ja' : 'vi'
  }

  private getMessageTemplate() {
    return LINE_MESSAGE_TEMPLATES[this.getLocale()]
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

    const extractUri = (obj: unknown): string | undefined => {
      if (!obj || typeof obj !== 'object') return undefined
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = extractUri(item)
          if (found) return found
        }
        return undefined
      }
      const record = obj as Record<string, unknown>
      if (
        record.action &&
        typeof record.action === 'object' &&
        typeof (record.action as Record<string, unknown>).uri === 'string'
      ) {
        return (record.action as Record<string, unknown>).uri as string
      }
      for (const key of Object.keys(record)) {
        const found = extractUri(record[key])
        if (found) return found
      }
      return undefined
    }

    return extractUri(messages)
  }
}
