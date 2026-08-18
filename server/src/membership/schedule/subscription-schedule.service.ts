import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { LineMessagingService } from '../../line-messaging/line-messaging.service'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

@Injectable()
export class SubscriptionScheduleService {
  private readonly logger = new Logger(SubscriptionScheduleService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly lineMessaging: LineMessagingService
  ) {}

  /** 08:00 VN (01:00 UTC) — Gửi thông báo nhắc gia hạn cho các gói hết hạn vào ngày mai (today_vn + 1) */
  @Cron('0 8 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async sendExpiringSubscriptionReminders() {
    const today = todayVN()
    const tomorrow = addDays(today, 1)

    const expiringSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: tomorrow,
        deletedAt: null,
      },
      include: {
        package: { select: { name: true } },
        member: { select: { userId: true } },
      },
    })

    if (expiringSubs.length === 0) return

    const endDateStr = tomorrow.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    let notifiedCount = 0

    for (const sub of expiringSubs) {
      const packageName = sub.package?.name ?? 'Gói tập'
      const dedupeKey = `subscription:${sub.subscriptionId.toString()}:expiring_1d:${tomorrow.toISOString().split('T')[0]}`

      // 1. In-App Notification
      const created = await this.notifications.safeNotifyUser(sub.member.userId, {
        type: 'subscription.expiring_soon',
        title: 'Gói tập sắp hết hạn',
        message: `Gói tập ${packageName} của bạn sẽ hết hạn vào ngày mai (${endDateStr}). Hãy gia hạn sớm để không bị gián đoạn tập luyện.`,
        resourceType: 'subscription',
        resourceId: sub.subscriptionId.toString(),
        metadata: {
          packageName,
          endDate: tomorrow.toISOString(),
          daysRemaining: 1,
        },
        dedupeKey,
      })

      // 2. LINE Push Message (nếu có tài khoản LINE)
      await this.lineMessaging.safePushSubscriptionExpiringReminder(sub.subscriptionId)

      if (created) notifiedCount++
    }

    this.logger.log(
      `[subscription:expiring-reminders] Checked ${expiringSubs.length} subscription(s), created ${notifiedCount} in-app notification(s)`
    )
  }

  /** 00:05 VN (17:05 UTC) — active → expired khi end_date <= today_vn */
  @Cron('5 17 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async expireSubscriptions() {
    const today = todayVN()

    // Tìm PT subscriptions sắp expire để reset trainer cho member
    const ptSubsToExpire = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lt: today },
        deletedAt: null,
        trainerId: { not: null },
      },
      select: { memberId: true },
    })

    const { count } = await this.prisma.subscription.updateMany({
      where: { status: 'active', endDate: { lt: today }, deletedAt: null },
      data: { status: 'expired' },
    })

    if (ptSubsToExpire.length > 0) {
      const memberIds = ptSubsToExpire.map((s) => s.memberId)
      await this.prisma.member.updateMany({
        where: { memberId: { in: memberIds } },
        data: { primaryTrainerId: null },
      })
      this.logger.log(`[subscription:expire] reset trainer for ${ptSubsToExpire.length} member(s)`)
    }

    if (count > 0) this.logger.log(`[subscription:expire] ${count} subscription(s) → expired`)
  }

  /** 00:10 VN (17:10 UTC) — pending → active khi start_date ≤ today_vn VÀ có payment success */
  @Cron('10 17 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async activatePendingSubscriptions() {
    const today = todayVN()

    const pendingSubs = await this.prisma.subscription.findMany({
      where: { status: 'pending', startDate: { lte: today }, deletedAt: null },
      select: {
        subscriptionId: true,
        payments: { where: { status: 'success' }, select: { paymentId: true }, take: 1 },
      },
    })

    const toActivate = pendingSubs.filter((s) => s.payments.length > 0).map((s) => s.subscriptionId)

    if (toActivate.length === 0) return

    const { count } = await this.prisma.subscription.updateMany({
      where: { subscriptionId: { in: toActivate } },
      data: { status: 'active' },
    })
    this.logger.log(`[subscription:activate-pending] ${count} subscription(s) → active`)
  }

  /** 00:15 VN (17:15 UTC) — pending → cancelled sau 24h không có payment success */
  @Cron('15 17 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async cancelUnpaidPendingSubscriptions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const pendingSubs = await this.prisma.subscription.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff }, deletedAt: null },
      select: {
        subscriptionId: true,
        payments: { where: { status: 'success' }, select: { paymentId: true }, take: 1 },
      },
    })

    const toCancel = pendingSubs.filter((s) => s.payments.length === 0).map((s) => s.subscriptionId)

    if (toCancel.length === 0) return

    const { count } = await this.prisma.subscription.updateMany({
      where: { subscriptionId: { in: toCancel } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
    this.logger.log(`[subscription:cancel-unpaid-pending] ${count} subscription(s) → cancelled`)
  }
}
