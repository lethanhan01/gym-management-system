import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PackageStatus, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'
import { ListSubscriptionsDto } from './dto/list-subscriptions.dto'
import { RenewSubscriptionDto } from './dto/renew-subscription.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isOwnerOrStaff(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return user.roles.some((r) => r === 'owner' || r === 'staff')
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createSubscription(dto: CreateSubscriptionDto, caller: AuthenticatedUser) {
    const memberId = BigInt(dto.memberId)

    if (!isOwnerOrStaff(caller) && caller.roles.includes('member')) {
      const callerMemberId = await this.resolveCallerMemberId(caller)
      if (callerMemberId !== memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Member chi duoc tao subscription cho chinh minh',
        })
      }
    }

    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: { user: true },
    })
    if (!member)
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Hoi vien khong ton tai',
      })

    if (!isOwnerOrStaff(caller) && !member.user.emailVerifiedAt) {
      throw new ForbiddenException({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Hoi vien chua xac thuc email',
      })
    }

    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg)
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Goi tap khong ton tai hoac da ngung kinh doanh',
      })

    const existingSub = await this.prisma.subscription.findFirst({
      where: {
        memberId,
        deletedAt: null,
        OR: [
          { status: SubscriptionStatus.pending },
          { status: SubscriptionStatus.active, endDate: { gte: todayVN() } },
        ],
      },
    })
    if (existingSub) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_ALREADY_EXISTS',
        message:
          'Hoi vien da co goi tap dang hoat dong hoac cho kich hoat. Vui long huy goi cu truoc khi dang ky goi moi.',
      })
    }

    let trainerId: bigint | null = null
    if (pkg.includesPt) {
      if (!dto.trainerId) {
        throw new BadRequestException({
          success: false,
          code: 'TRAINER_REQUIRED',
          message: 'Goi tap co PT yeu cau chon PT truoc khi dang ky',
        })
      }
      const trainer = await this.prisma.staff.findFirst({
        where: {
          staffId: BigInt(dto.trainerId),
          deletedAt: null,
          position: { in: ['trainer', 'pt'] },
        },
      })
      if (!trainer)
        throw new BadRequestException({
          success: false,
          code: 'TRAINER_NOT_FOUND',
          message: 'PT khong ton tai hoac khong hop le',
        })
      trainerId = trainer.staffId
    }

    const today = todayVN()
    const endDate = addDays(today, pkg.durationDays)

    const subscription = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          memberId,
          packageId: pkg.packageId,
          trainerId,
          startDate: today,
          endDate,
          status: SubscriptionStatus.pending,
        },
        include: { member: true, package: true, trainer: { include: { user: true } } },
      })
      if (trainerId !== null) {
        await tx.member.update({ where: { memberId }, data: { primaryTrainerId: trainerId } })
      }
      return sub
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'subscription.create',
      resourceType: 'subscription',
      resourceId: subscription.subscriptionId.toString(),
      afterData: {
        memberId: memberId.toString(),
        packageId: dto.packageId,
        trainerId: trainerId?.toString() ?? null,
        startDate: today,
        endDate,
        status: 'pending',
      } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSubscription(subscription) }
  }

  async renewSubscription(
    subscriptionId: bigint,
    dto: RenewSubscriptionDto,
    caller: AuthenticatedUser
  ) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: {
        member: { include: { user: true } },
        package: true,
        trainer: { include: { user: true } },
      },
    })
    if (!sub || sub.status !== SubscriptionStatus.active) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Chi co the gia han goi dang hoat dong',
      })
    }

    if (sub.package!.status !== PackageStatus.active) {
      throw new BadRequestException({
        success: false,
        code: 'PACKAGE_INACTIVE',
        message: 'Gói tập này đã ngừng bán, không thể gia hạn.',
      })
    }

    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)

    const newEndDate = addDays(sub.endDate, sub.package!.durationDays)
    // Gia han = cong them duration + ghi lich su thanh toan, trong cung 1 transaction
    // de tranh truong hop cong endDate nhung thanh toan that bai (hoac nguoc lai).
    // Amount lay tu gia goi o server, khong tin client.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          memberId: sub.memberId,
          subscriptionId: sub.subscriptionId,
          amount: sub.package!.price,
          method: dto.method,
          status: PaymentStatus.success,
          transactionReference: dto.transactionReference?.trim() || null,
          paidAt: new Date(),
        },
      })
      return tx.subscription.update({
        where: { subscriptionId },
        data: { endDate: newEndDate },
        include: { member: true, package: true, trainer: { include: { user: true } } },
      })
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'subscription.renew',
      resourceType: 'subscription',
      resourceId: subscriptionId.toString(),
      beforeData: { endDate: sub.endDate } as unknown as Record<string, unknown>,
      afterData: { endDate: newEndDate } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSubscription(updated) }
  }

  async listSubscriptions(dto: ListSubscriptionsDto, caller: AuthenticatedUser) {
    const {
      page = 1,
      pageSize = 20,
      memberId,
      packageId,
      status,
      from,
      to,
      sort = 'created_at:desc',
    } = dto
    const where: Prisma.SubscriptionWhereInput = { deletedAt: null }

    if (packageId) where.packageId = BigInt(packageId)
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      }
    }

    if (isOwnerOrStaff(caller)) {
      if (memberId) where.memberId = BigInt(memberId)
    } else if (caller.roles.includes('member')) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (memberId && BigInt(memberId) !== selfMemberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Member chi duoc xem subscription cua chinh minh',
        })
      }
      where.memberId = selfMemberId
    } else if (caller.roles.includes('trainer')) {
      if (!caller.staffId)
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong tim thay staff profile',
        })
      if (memberId) {
        await this.assertTrainerOwnsMember(BigInt(memberId), caller.staffId)
        where.memberId = BigInt(memberId)
      } else {
        where.trainerId = caller.staffId
      }
    } else {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen xem subscriptions',
      })
    }

    const orderBy = this.buildOrder(sort)
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { member: true, package: true, trainer: { include: { user: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.subscription.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeSubscription(s)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async listByMember(memberId: bigint, caller: AuthenticatedUser) {
    return this.listSubscriptions({ memberId: Number(memberId), page: 1, pageSize: 100 }, caller)
  }

  async getSubscription(subscriptionId: bigint, caller: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: {
        member: { include: { user: true } },
        package: true,
        trainer: { include: { user: true } },
      },
    })
    if (!sub)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Subscription khong ton tai',
      })
    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)
    return { data: this.serializeSubscription(sub) }
  }

  async cancelSubscription(subscriptionId: bigint, caller: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { member: { include: { user: true } }, package: true },
    })
    if (
      !sub ||
      sub.status === SubscriptionStatus.cancelled ||
      sub.status === SubscriptionStatus.expired
    ) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Subscription khong ton tai',
      })
    }

    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)

    if (sub.status !== SubscriptionStatus.active && sub.status !== SubscriptionStatus.pending) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_NOT_CANCELLABLE',
        message: `Khong the huy subscription voi trang thai ${sub.status}`,
      })
    }

    const now = new Date()
    const today = todayVN()
    const yesterday = addDays(today, -1)
    const effectiveEndDate = sub.endDate > yesterday ? yesterday : sub.endDate
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { subscriptionId },
        data: { status: SubscriptionStatus.cancelled, cancelledAt: now, endDate: effectiveEndDate },
      })
      if (sub.trainerId !== null) {
        await tx.member.update({
          where: { memberId: sub.memberId },
          data: { primaryTrainerId: null },
        })
      }
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'subscription.cancel',
      resourceType: 'subscription',
      resourceId: subscriptionId.toString(),
      beforeData: { status: sub.status } as unknown as Record<string, unknown>,
      afterData: { status: 'cancelled' } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        subscriptionId: subscriptionId.toString(),
        status: 'cancelled',
        cancelledAt: now,
        endDate: effectiveEndDate,
      },
    }
  }

  private async assertCanAccessSubscription(
    memberId: bigint,
    memberUserId: bigint,
    caller: AuthenticatedUser
  ) {
    if (isOwnerOrStaff(caller)) return
    if (
      caller.roles.includes('member') &&
      (caller.userId === memberUserId || caller.memberId === memberId)
    )
      return
    if (caller.roles.includes('trainer') && caller.staffId) {
      await this.assertTrainerOwnsMember(memberId, caller.staffId)
      return
    }
    throw new ForbiddenException({
      success: false,
      code: 'FORBIDDEN',
      message: 'Khong co quyen truy cap subscription nay',
    })
  }

  private async assertTrainerOwnsMember(memberId: bigint, staffId: bigint) {
    const activePtSub = await this.prisma.subscription.findFirst({
      where: {
        memberId,
        trainerId: staffId,
        status: SubscriptionStatus.active,
        endDate: { gte: todayVN() },
        deletedAt: null,
      },
    })
    if (!activePtSub) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'PT khong phu trach member nay',
      })
    }
  }

  private async resolveCallerMemberId(caller: AuthenticatedUser): Promise<bigint> {
    if (caller.memberId) return caller.memberId
    const member = await this.prisma.member.findFirst({
      where: { userId: caller.userId, deletedAt: null },
    })
    if (!member)
      throw new ForbiddenException({
        success: false,
        code: 'MEMBER_PROFILE_NOT_FOUND',
        message: 'Khong tim thay member profile',
      })
    return member.memberId
  }

  private buildOrder(sort: string): Prisma.SubscriptionOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'asc' ? 'asc' : 'desc'
    if (field === 'start_date') return { startDate: dir }
    if (field === 'end_date') return { endDate: dir }
    return { createdAt: dir }
  }

  private serializeSubscription(sub: {
    subscriptionId: bigint
    memberId: bigint
    packageId: bigint
    trainerId?: bigint | null
    startDate: Date
    endDate: Date
    status: string
    cancelledAt: Date | null
    deletedAt: Date | null
    createdAt: Date
    member?: { memberCode?: string | null }
    package?: {
      packageId?: bigint
      packageCode?: string
      name: string
      durationDays: number
      price: { toFixed: (n: number) => string }
      status?: string
    }
    trainer?: { staffId: bigint; user: { fullName: string } } | null
  }) {
    const today = todayVN()
    const effectiveStatus =
      sub.status === 'active' && sub.endDate < today ? 'expired' : sub.status
    const daysLeft =
      effectiveStatus === 'active'
        ? Math.max(0, Math.ceil((sub.endDate.getTime() - today.getTime()) / 86400000))
        : null

    return {
      subscriptionId: sub.subscriptionId.toString(),
      memberId: sub.memberId.toString(),
      memberCode: sub.member?.memberCode ?? null,
      packageId: sub.packageId.toString(),
      packageName: sub.package?.name ?? null,
      package: sub.package
        ? {
            packageId: (sub.package.packageId ?? sub.packageId).toString(),
            packageCode: sub.package.packageCode ?? null,
            name: sub.package.name,
            durationDays: sub.package.durationDays,
            price: sub.package.price.toFixed(2),
            status: sub.package.status ?? null,
          }
        : null,
      trainerId: sub.trainerId?.toString() ?? null,
      trainerName: sub.trainer?.user?.fullName ?? null,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: effectiveStatus,
      daysLeft,
      cancelledAt: sub.cancelledAt,
      createdAt: sub.createdAt,
    }
  }
}
