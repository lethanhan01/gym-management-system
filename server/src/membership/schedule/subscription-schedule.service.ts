import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class SubscriptionScheduleService {
  private readonly logger = new Logger(SubscriptionScheduleService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** 00:05 VN (17:05 UTC) — active → expired khi end_date < today_vn */
  @Cron('5 17 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async expireSubscriptions() {
    const today = todayVN()

    // Tìm PT subscriptions sắp expire để reset trainer cho member
    const ptSubsToExpire = await this.prisma.subscription.findMany({
      where: { status: 'active', endDate: { lt: today }, deletedAt: null, trainerId: { not: null } },
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

    const toActivate = pendingSubs
      .filter((s) => s.payments.length > 0)
      .map((s) => s.subscriptionId)

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

    const toCancel = pendingSubs
      .filter((s) => s.payments.length === 0)
      .map((s) => s.subscriptionId)

    if (toCancel.length === 0) return

    const { count } = await this.prisma.subscription.updateMany({
      where: { subscriptionId: { in: toCancel } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
    this.logger.log(`[subscription:cancel-unpaid-pending] ${count} subscription(s) → cancelled`)
  }
}
