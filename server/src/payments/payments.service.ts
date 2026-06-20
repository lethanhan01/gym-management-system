import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { ListPaymentsDto } from './dto/list-payments.dto'
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function isOwnerOrStaff(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return user.roles.some((r) => r === 'owner' || r === 'staff')
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPayment(dto: CreatePaymentDto, caller: AuthenticatedUser) {
    const memberId = BigInt(dto.memberId)
    const subscriptionId = BigInt(dto.subscriptionId)

    if (caller.roles.includes('member') && !isOwnerOrStaff(caller)) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (selfMemberId !== memberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Member chi duoc thanh toan cho chinh minh' })
      }
    }


    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { package: true, member: { include: { user: true } } },
    })
    if (!sub || sub.memberId !== memberId) {
      throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'memberId hoac subscriptionId khong hop le' })
    }

    if (sub.status !== SubscriptionStatus.pending) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_NOT_PENDING',
        message: `Subscription dang o trang thai ${sub.status}`,
      })
    }

    const paymentStatus = dto.status ?? PaymentStatus.success
    const today = todayVN()
    const activeOther = await this.prisma.subscription.findFirst({
      where: {
        memberId: sub.memberId,
        subscriptionId: { not: sub.subscriptionId },
        status: SubscriptionStatus.active,
        endDate: { gte: today },
        deletedAt: null,
      },
    })
    const shouldActivate = paymentStatus === PaymentStatus.success && sub.startDate <= today && !activeOther

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          memberId: sub.memberId,
          subscriptionId: sub.subscriptionId,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          status: paymentStatus,
          transactionReference: dto.transactionReference?.trim() || null,
          paidAt: new Date(),
        },
      })

      const subscription = shouldActivate
        ? await tx.subscription.update({
            where: { subscriptionId: sub.subscriptionId },
            data: { status: SubscriptionStatus.active },
            include: { package: true },
          })
        : sub

      return { payment, subscription }
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: paymentStatus === PaymentStatus.success ? 'payment.success' : 'payment.fail',
      resourceType: 'payment',
      resourceId: result.payment.paymentId.toString(),
      afterData: {
        subscriptionId: dto.subscriptionId,
        amount: dto.amount,
        method: dto.method,
        status: paymentStatus,
        activated: shouldActivate,
      } as unknown as Record<string, unknown>,
    })
    if (shouldActivate) {
      this.audit.log({
        actorUserId: caller.userId,
        action: 'subscription.activate',
        resourceType: 'subscription',
        resourceId: sub.subscriptionId.toString(),
        afterData: { activatedByPaymentId: result.payment.paymentId.toString() } as unknown as Record<string, unknown>,
      })
    }

    return {
      data: {
        paymentId: result.payment.paymentId.toString(),
        subscriptionId: sub.subscriptionId.toString(),
        memberId: sub.memberId.toString(),
        amount: result.payment.amount.toFixed(2),
        method: result.payment.method,
        status: result.payment.status,
        transactionReference: result.payment.transactionReference,
        paidAt: result.payment.paidAt,
        subscription: {
          subscriptionId: result.subscription.subscriptionId.toString(),
          status: result.subscription.status,
          startDate: result.subscription.startDate,
          endDate: result.subscription.endDate,
        },
        subscriptionActivated: shouldActivate,
      },
    }
  }

  async listPayments(dto: ListPaymentsDto, caller: AuthenticatedUser) {
    const {
      page = 1,
      pageSize = 20,
      memberId,
      subscriptionId,
      status,
      method,
      sort = 'paid_at:desc',
    } = dto
    const from = dto.from ?? dto.dateFrom
    const to = dto.to ?? dto.dateTo

    const where: Prisma.PaymentWhereInput = {}
    if (subscriptionId) where.subscriptionId = BigInt(subscriptionId)
    if (status) where.status = status
    if (method) where.method = method
    if (from || to) {
      where.paidAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      }
    }

    if (isOwnerOrStaff(caller)) {
      if (memberId) where.memberId = BigInt(memberId)
    } else if (caller.roles.includes('member')) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (memberId && BigInt(memberId) !== selfMemberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Member chi duoc xem payment cua chinh minh' })
      }
      where.memberId = selfMemberId
      if (subscriptionId) {
        await this.assertSubscriptionBelongsToMember(BigInt(subscriptionId), selfMemberId)
      }
    } else if (caller.roles.includes('trainer')) {
      if (!caller.staffId) throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong tim thay staff profile' })
      if (memberId) {
        await this.assertTrainerOwnsMember(BigInt(memberId), caller.staffId)
        where.memberId = BigInt(memberId)
      } else {
        where.member = { primaryTrainerId: caller.staffId }
      }
    } else {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong co quyen xem payments' })
    }

    const orderBy = this.buildOrder(sort)
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          member: {
            include: {
              user: true,
              primaryTrainer: { include: { user: true } },
            },
          },
          subscription: {
            include: {
              package: true,
              trainer: { include: { user: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.payment.count({ where }),
    ])

    return {
      data: data.map((p) => {
        const responsibleStaff = p.subscription.trainer ?? p.member?.primaryTrainer ?? null
        const packageData = p.subscription.package
        const packageName = packageData?.name ?? 'Goi tap'
        return {
          paymentId: p.paymentId.toString(),
          memberId: p.memberId.toString(),
          subscriptionId: p.subscriptionId.toString(),
          packageName,
          amount: p.amount.toFixed(2),
          method: p.method,
          status: p.status,
          transactionReference: p.transactionReference,
          paidAt: p.paidAt,
          canRefund: isOwnerOrStaff(caller) && p.status === PaymentStatus.success,
          member: {
            memberId: p.member?.memberId.toString() ?? p.memberId.toString(),
            memberCode: p.member?.memberCode ?? `MEM-${p.memberId.toString()}`,
            fullName: p.member?.user.fullName ?? `Hoi vien #${p.memberId.toString()}`,
          },
          service: {
            subscriptionId: p.subscription.subscriptionId?.toString() ?? p.subscriptionId.toString(),
            packageId: packageData?.packageId?.toString() ?? '',
            packageCode: packageData?.packageCode ?? '',
            name: packageName,
          },
          staff: responsibleStaff
            ? {
                staffId: responsibleStaff.staffId.toString(),
                staffCode: responsibleStaff.staffCode,
                fullName: responsibleStaff.user.fullName,
                source: p.subscription.trainer ? 'subscription' : 'member',
              }
            : null,
        }
      }),
      meta: { page, pageSize, totalItems: total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  }

  private async resolveCallerMemberId(caller: AuthenticatedUser): Promise<bigint> {
    if (caller.memberId) return caller.memberId
    const member = await this.prisma.member.findFirst({ where: { userId: caller.userId, deletedAt: null } })
    if (!member) throw new ForbiddenException({ success: false, code: 'MEMBER_PROFILE_NOT_FOUND', message: 'Khong tim thay member profile' })
    return member.memberId
  }

  private async assertSubscriptionBelongsToMember(subscriptionId: bigint, memberId: bigint) {
    const sub = await this.prisma.subscription.findFirst({ where: { subscriptionId, deletedAt: null } })
    if (!sub || sub.memberId !== memberId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Subscription khong thuoc member nay' })
    }
  }

  private async assertTrainerOwnsMember(memberId: bigint, staffId: bigint) {
    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member || member.primaryTrainerId !== staffId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'PT khong phu trach member nay' })
    }
  }

  private buildOrder(sort: string): Prisma.PaymentOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'asc' ? 'asc' : 'desc'
    if (field === 'amount') return { amount: dir }
    return { paidAt: dir }
  }

  async listPaymentAccounts(memberId: bigint) {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { memberId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return { accounts }
  }

  async createPaymentAccount(memberId: bigint, dto: CreatePaymentAccountDto) {
    if (dto.isDefault) {
      await this.prisma.paymentAccount.updateMany({
        where: { memberId, deletedAt: null },
        data: { isDefault: false },
      })
    }
    const account = await this.prisma.paymentAccount.create({
      data: {
        memberId,
        type: dto.type,
        provider: dto.provider,
        accountRef: dto.accountRef,
        label: dto.label,
        isDefault: dto.isDefault ?? false,
      },
    })
    return { account }
  }

  async setDefaultPaymentAccount(memberId: bigint, accountId: number) {
    await this.prisma.paymentAccount.updateMany({
      where: { memberId, deletedAt: null },
      data: { isDefault: false },
    })
    const account = await this.prisma.paymentAccount.update({
      where: { accountId },
      data: { isDefault: true },
    })
    return { account }
  }

  async removePaymentAccount(memberId: bigint, accountId: number) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { accountId, deletedAt: null },
    })
    if (!account) throw new NotFoundException({ success: false, message: 'Tài khoản không tồn tại' })
    if (account.memberId !== memberId) throw new ForbiddenException({ success: false, message: 'Không có quyền xoá tài khoản này' })
    await this.prisma.paymentAccount.update({
      where: { accountId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  }
}
