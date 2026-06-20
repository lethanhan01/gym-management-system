import { randomInt } from 'crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Member, PaymentStatus, Prisma, SubscriptionStatus, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AuditService } from '../common/audit/audit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMemberDto } from './dto/create-member.dto'
import { SelfRegisterDto } from './dto/self-register.dto'
import { ListMembersDto, SubscriptionStatusFilter } from './dto/list-members.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { MemberProgressService } from './member-progress.service'
import { TrainerAssignmentService } from './trainer-assignment.service'

const OTP_TTL_MS = 10 * 60 * 1000

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function effectiveSubStatus(status: SubscriptionStatus, endDate: Date): SubscriptionStatus {
  if (status === SubscriptionStatus.active && endDate < todayVN()) {
    return SubscriptionStatus.expired
  }
  return status
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
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly otpStore: OtpStoreService,
    private readonly trainerAssignment: TrainerAssignmentService,
    private readonly memberProgress: MemberProgressService,
  ) {}

  /** UC03A: staff creates a member, active subscription, and successful payment at the counter. */
  async createMember(dto: CreateMemberDto, actorUserId: bigint) {
    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Goi tap khong ton tai hoac da ngung kinh doanh',
      })
    }

    await this.assertUniqueUserFields(dto.email, dto.phone)

    const memberCode = await this.generateMemberCode()
    const passwordHash = await bcrypt.hash(dto.password, 12)
    const today = todayVN()
    const endDate = addDays(today, pkg.durationDays - 1)

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
          status: UserStatus.active,
          emailVerifiedAt: new Date(),
        },
      })

      const member = await tx.member.create({
        data: {
          userId: user.userId,
          memberCode,
          dateOfBirth: new Date(dto.dateOfBirth),
          address: dto.address,
        },
      })

      const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
      if (memberGroup) {
        await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
      }

      const subscription = await tx.subscription.create({
        data: {
          memberId: member.memberId,
          packageId: pkg.packageId,
          startDate: today,
          endDate,
          status: SubscriptionStatus.active,
        },
      })

      const payment = await tx.payment.create({
        data: {
          memberId: member.memberId,
          subscriptionId: subscription.subscriptionId,
          amount: pkg.price,
          method: dto.paymentMethod,
          status: PaymentStatus.success,
          transactionReference: dto.transactionReference?.trim() || null,
          paidAt: new Date(),
        },
      })

      return { user, member, subscription, payment }
    })

    this.audit.log({
      actorUserId,
      action: 'member.create',
      resourceType: 'member',
      resourceId: result.member.memberId.toString(),
      afterData: {
        memberCode,
        email: dto.email,
        packageId: dto.packageId,
        subscriptionId: result.subscription.subscriptionId.toString(),
        paymentId: result.payment.paymentId.toString(),
      } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeMember(result.member, result.user) }
  }

  /** UC03B: public online self-registration, optionally with a pending subscription. */
  async selfRegister(dto: SelfRegisterDto) {
    await this.assertUniqueUserFields(dto.email, dto.phone)

    const pkg = dto.packageId
      ? await this.prisma.package.findFirst({
          where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
        })
      : null
    if (dto.packageId && !pkg) {
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Goi tap khong ton tai hoac da ngung kinh doanh',
      })
    }

    const memberCode = await this.generateMemberCode()
    const passwordHash = await bcrypt.hash(dto.password, 12)
    const otpRaw = randomInt(100000, 1000000).toString()
    const otpHash = await bcrypt.hash(otpRaw, 10)
    const today = todayVN()

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
          status: UserStatus.pending_verification,
        },
      })

      const member = await tx.member.create({
        data: {
          userId: user.userId,
          memberCode,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          address: dto.address,
        },
      })

      const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
      if (memberGroup) {
        await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
      }

      const subscription = pkg
        ? await tx.subscription.create({
            data: {
              memberId: member.memberId,
              packageId: pkg.packageId,
              startDate: today,
              endDate: addDays(today, pkg.durationDays - 1),
              status: SubscriptionStatus.pending,
            },
            include: { package: true },
          })
        : null

      return { user, member, subscription }
    })

    this.otpStore.set(result.user.userId, 'email_verify', otpHash, OTP_TTL_MS)

    // TODO: send OTP by email when SMTP is configured.
    // eslint-disable-next-line no-console
    console.log(`[DEV] OTP email_verify for ${dto.email}: ${otpRaw}`)

    const devOtp = process.env.NODE_ENV !== 'production' ? otpRaw : undefined

    this.audit.log({
      actorUserId: null,
      action: 'member.create',
      resourceType: 'member',
      resourceId: result.member.memberId.toString(),
      afterData: { memberCode, email: dto.email, selfRegister: true } as unknown as Record<
        string,
        unknown
      >,
    })
    if (result.subscription) {
      this.audit.log({
        actorUserId: null,
        action: 'subscription.create',
        resourceType: 'subscription',
        resourceId: result.subscription.subscriptionId.toString(),
        afterData: {
          memberId: result.member.memberId.toString(),
          packageId: result.subscription.packageId.toString(),
          status: result.subscription.status,
        } as unknown as Record<string, unknown>,
      })
    }

    return {
      data: {
        ...this.serializeMember(result.member, result.user),
        message: 'Registration created. Please verify email.',
        ...(devOtp && { devOtp }),
        subscription: result.subscription
          ? {
              subscriptionId: result.subscription.subscriptionId.toString(),
              packageId: result.subscription.packageId.toString(),
              status: result.subscription.status,
            }
          : null,
      },
    }
  }

  async listMembers(dto: ListMembersDto, caller?: AuthenticatedUser) {
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      subStatus,
      sort = 'created_at:desc',
      trainerId,
      includeDeleted = false,
    } = dto

    const where: Prisma.MemberWhereInput = {}
    if (!includeDeleted || !caller?.roles.includes('owner')) where.deletedAt = null
    if (caller?.roles.includes('trainer') && !isOwnerOrStaff(caller)) {
      if (!caller.staffId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong tim thay staff profile',
        })
      }
      where.primaryTrainerId = caller.staffId
    } else if (trainerId) {
      where.primaryTrainerId = BigInt(trainerId)
    }
    if (status) where.user = { status }
    if (subStatus === 'active') {
      where.subscriptions = {
        some: { status: 'active', endDate: { gte: todayVN() }, deletedAt: null },
      }
    } else if (subStatus === 'expired') {
      where.subscriptions = {
        none: { status: 'active', endDate: { gte: todayVN() }, deletedAt: null },
      }
    }
    if (search) {
      where.OR = [
        { memberCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const orderBy = this.buildMemberOrder(sort)

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: {
          user: true,
          subscriptions: {
            where: { status: 'active', endDate: { gte: todayVN() }, deletedAt: null },
            orderBy: { endDate: 'desc' },
            take: 1,
            include: { package: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.member.count({ where }),
    ])

    return {
      data: data.map((m) => this.serializeMemberWithSub(m)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async getMember(memberId: bigint) {
    const member = await this.findMemberDetail(memberId)
    return { data: this.serializeMemberDetail(member) }
  }

  async getMemberForCaller(memberId: bigint, caller: AuthenticatedUser) {
    const member = await this.findMemberDetail(memberId)
    this.assertCanReadMember(member, caller)
    return { data: this.serializeMemberDetail(member) }
  }

  async updateMember(memberId: bigint, dto: UpdateMemberDto, actorUserId: bigint) {
    return this.updateMemberInternal(memberId, dto, actorUserId)
  }

  async updateMemberForCaller(memberId: bigint, dto: UpdateMemberDto, caller: AuthenticatedUser) {
    const existing = await this.findMemberWithUser(memberId)
    const isSelf = existing.userId === caller.userId || caller.memberId === memberId
    if (!isSelf && !isOwnerOrStaff(caller)) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen cap nhat hoi vien nay',
      })
    }
    return this.updateMemberInternal(memberId, dto, caller.userId, existing)
  }

  async deleteMember(memberId: bigint, actorUserId: bigint) {
    const member = await this.findMemberWithUser(memberId)

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.member.update({ where: { memberId }, data: { deletedAt: now } }),
      this.prisma.user.update({ where: { userId: member.userId }, data: { deletedAt: now } }),
    ])

    this.audit.log({
      actorUserId,
      action: 'member.delete',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: { memberCode: member.memberCode, email: member.user.email } as unknown as Record<
        string,
        unknown
      >,
    })
  }

  async assignTrainer(memberId: bigint, trainerId: number | null | undefined, actorUserId: bigint) {
    return this.trainerAssignment.assignTrainer(memberId, trainerId, actorUserId)
  }

  private async updateMemberInternal(
    memberId: bigint,
    dto: UpdateMemberDto,
    actorUserId: bigint,
    existing?: Prisma.MemberGetPayload<{ include: { user: true } }>
  ) {
    const member = existing ?? (await this.findMemberWithUser(memberId))

    const updated = await this.prisma.$transaction(async (tx) => {
      const user =
        dto.fullName !== undefined || dto.phone !== undefined
          ? await tx.user.update({
              where: { userId: member.userId },
              data: {
                ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
              },
            })
          : member.user

      const updatedMember =
        dto.dateOfBirth !== undefined || dto.address !== undefined
          ? await tx.member.update({
              where: { memberId },
              data: {
                ...(dto.dateOfBirth !== undefined
                  ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }
                  : {}),
                ...(dto.address !== undefined ? { address: dto.address } : {}),
              },
            })
          : member

      return { member: updatedMember, user }
    })

    this.audit.log({
      actorUserId,
      action: 'member.update',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: {
        fullName: member.user.fullName,
        phone: member.user.phone,
        address: member.address,
      } as unknown as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>,
    })

    return { data: this.serializeMember(updated.member, updated.user) }
  }

  private async findMemberWithUser(memberId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: { user: true },
    })
    if (!member)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Hoi vien khong ton tai',
      })
    return member
  }

  private async findMemberDetail(memberId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: {
        user: true,
        primaryTrainer: { include: { user: true } },
        subscriptions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { package: true },
        },
      },
    })
    if (!member)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Hoi vien khong ton tai',
      })
    return member
  }

  private assertCanReadMember(
    member: Prisma.MemberGetPayload<{
      include: {
        user: true
        primaryTrainer: { include: { user: true } }
        subscriptions: { include: { package: true } }
      }
    }>,
    caller: AuthenticatedUser
  ) {
    if (isOwnerOrStaff(caller)) return
    if (
      caller.roles.includes('trainer') &&
      caller.staffId &&
      member.primaryTrainerId === caller.staffId
    )
      return
    if (
      caller.roles.includes('member') &&
      (member.userId === caller.userId || caller.memberId === member.memberId)
    )
      return
    throw new ForbiddenException({
      success: false,
      code: 'FORBIDDEN',
      message: 'Khong co quyen truy cap hoi vien nay',
    })
  }

  private async assertUniqueUserFields(email: string, phone?: string | null) {
    const OR: Prisma.UserWhereInput[] = [{ email }]
    if (phone) OR.push({ phone })
    const existing = await this.prisma.user.findFirst({ where: { deletedAt: null, OR } })
    if (existing) {
      throw new ConflictException({
        success: false,
        code: 'DUPLICATE_VALUE',
        message: 'Email hoac phone da duoc su dung',
      })
    }
  }

  private async generateMemberCode(): Promise<string> {
    const year = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      .slice(0, 4)
    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.prisma.member.count({ where: { deletedAt: null } })
      const seq = String(count + 1 + attempt).padStart(6, '0')
      const code = `MEM-${year}-${seq}`
      const existing = await this.prisma.member.findUnique({ where: { memberCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({
      success: false,
      code: 'MEMBER_CODE_GENERATION_FAILED',
      message: 'Khong the tao memberCode sau 10 lan thu',
    })
  }

  private buildMemberOrder(sort: string): Prisma.MemberOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'asc' ? 'asc' : 'desc'
    if (field === 'member_code') return { memberCode: dir }
    if (field === 'full_name') return { user: { fullName: dir } }
    return { createdAt: dir }
  }

  private serializeMember(
    member: Member,
    user: { fullName: string; email: string; phone: string | null; status: string }
  ) {
    return {
      memberId: member.memberId.toString(),
      memberCode: member.memberCode,
      userId: member.userId.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      primaryTrainerId: member.primaryTrainerId?.toString() ?? null,
      createdAt: member.createdAt,
    }
  }

  private serializeMemberWithSub(
    member: Prisma.MemberGetPayload<{
      include: { user: true; subscriptions: { include: { package: true } } }
    }>
  ) {
    return {
      ...this.serializeMember(member, member.user),
      activeSubscription: member.subscriptions[0]
        ? {
            subscriptionId: member.subscriptions[0].subscriptionId.toString(),
            packageName: member.subscriptions[0].package.name,
            endDate: member.subscriptions[0].endDate,
            status: effectiveSubStatus(member.subscriptions[0].status, member.subscriptions[0].endDate),
          }
        : null,
    }
  }

  private serializeMemberDetail(
    member: Prisma.MemberGetPayload<{
      include: {
        user: true
        primaryTrainer: { include: { user: true } }
        subscriptions: { include: { package: true } }
      }
    }>
  ) {
    return {
      ...this.serializeMember(member, member.user),
      trainerName: member.primaryTrainer?.user.fullName ?? null,
      emailVerifiedAt: member.user.emailVerifiedAt,
      avatarFileId: member.user.avatarFileId?.toString() ?? null,
      primaryTrainer: member.primaryTrainer
        ? {
            staffId: member.primaryTrainer.staffId.toString(),
            staffCode: member.primaryTrainer.staffCode,
            fullName: member.primaryTrainer.user.fullName,
            phone: member.primaryTrainer.user.phone,
            email: member.primaryTrainer.user.email,
          }
        : null,
      subscriptions: member.subscriptions.map((s) => ({
        subscriptionId: s.subscriptionId.toString(),
        packageId: s.packageId.toString(),
        packageName: s.package.name,
        includesPt: s.package.includesPt,
        startDate: s.startDate,
        endDate: s.endDate,
        status: effectiveSubStatus(s.status, s.endDate),
        cancelledAt: s.cancelledAt ?? null,
        createdAt: s.createdAt,
      })),
    }
  }

  async getAvailableTrainers() {
    return this.trainerAssignment.getAvailableTrainers()
  }

  async selfAssignTrainer(actorUserId: bigint, trainerId: number | null) {
    return this.trainerAssignment.selfAssignTrainer(actorUserId, trainerId)
  }

  async recordSelfProgress(memberId: bigint, dto: { weight: number; height?: number }) {
    return this.memberProgress.recordSelfProgress(memberId, dto)
  }
}
