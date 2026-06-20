import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { PaymentMethod, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { RenewSubscriptionDto } from './dto/renew-subscription.dto'
import { SubscriptionsService } from './subscriptions.service'

function makeSub(overrides: object = {}) {
  return {
    subscriptionId: 1n,
    memberId: 10n,
    packageId: 1n,
    trainerId: null as bigint | null,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    status: SubscriptionStatus.active as string,
    cancelledAt: null as Date | null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    member: {
      memberCode: 'MEM-001',
      userId: 100n,
      primaryTrainerId: null,
      user: {
        userId: 100n,
        fullName: 'Test Member',
        emailVerifiedAt: new Date('2024-01-01'),
      },
    },
    package: {
      packageId: 1n,
      packageCode: 'PKG-TEST',
      name: 'Basic Plan',
      durationDays: 30,
      price: { toFixed: (_n: number) => '500000.00' },
      includesPt: false,
      status: 'active',
      deletedAt: null,
    },
    trainer: null as { staffId: bigint; user: { fullName: string } } | null,
    ...overrides,
  }
}

function makeCaller(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 100n,
    email: 'user@gym.local',
    roles: ['member'],
    memberId: 10n,
    ...overrides,
  }
}

const mockPrisma = {
  member: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
  package: {
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService

  beforeEach(() => {
    service = new SubscriptionsService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockPrisma)
    )
  })

  // ---------------------------------------------------------------------------
  // createSubscription
  // ---------------------------------------------------------------------------

  describe('createSubscription', () => {
    const dto = { memberId: '10', packageId: '1' }

    it('throws ForbiddenException when member tries to create subscription for another member', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 99n })

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('throws BadRequestException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws ForbiddenException when member email is not verified (non-staff caller)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: null },
      })
      const caller = makeCaller()

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('throws BadRequestException when package does not exist or is inactive', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws ConflictException when member already has active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: false,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue({ subscriptionId: 99n })
      const caller = makeCaller()

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws BadRequestException when PT package has no trainerId in dto', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: true,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createSubscription(dto as any, caller)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws BadRequestException when specified trainer does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: true,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(
        service.createSubscription({ ...dto, trainerId: '99' } as any, caller)
      ).rejects.toThrow(BadRequestException)
    })

    it('creates subscription in transaction with pending status (no PT)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: false,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      mockPrisma.subscription.create.mockResolvedValue(makeSub())
      const caller = makeCaller()

      await service.createSubscription(dto as any, caller)

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SubscriptionStatus.pending }),
        })
      )
      expect(mockPrisma.member.update).not.toHaveBeenCalled()
    })

    it('updates member.primaryTrainerId in same transaction when PT package', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: true,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 5n })
      mockPrisma.subscription.create.mockResolvedValue(makeSub({ trainerId: 5n }))
      const caller = makeCaller()

      await service.createSubscription({ ...dto, trainerId: '5' } as any, caller)

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n },
          data: { primaryTrainerId: 5n },
        })
      )
    })

    it('staff can create subscription for any member bypassing email check', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: null },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: false,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      mockPrisma.subscription.create.mockResolvedValue(makeSub())
      const caller = makeCaller({ roles: ['staff'], memberId: undefined, staffId: '1' as any })

      await expect(service.createSubscription(dto as any, caller)).resolves.not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // renewSubscription
  // ---------------------------------------------------------------------------

  describe('renewSubscription', () => {
    const renewDto: RenewSubscriptionDto = { method: PaymentMethod.cash }

    it('throws NotFoundException when subscription does not exist', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.renewSubscription(1n, renewDto, caller)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when subscription is not active (expired)', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.expired })
      )
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.renewSubscription(1n, renewDto, caller)).rejects.toThrow(NotFoundException)
    })

    it('extends endDate by package durationDays', async () => {
      const sub = makeSub({ endDate: new Date('2024-01-31') })
      mockPrisma.subscription.findFirst.mockResolvedValue(sub)
      mockPrisma.subscription.update.mockResolvedValue(makeSub({ endDate: new Date('2024-03-01') }))
      const caller = makeCaller({ roles: ['owner'] })

      await service.renewSubscription(1n, renewDto, caller)

      const newEndDate: Date = mockPrisma.subscription.update.mock.calls[0][0].data.endDate
      expect(newEndDate.getTime()).toBeGreaterThan(new Date('2024-01-31').getTime())
    })
  })

  // ---------------------------------------------------------------------------
  // getSubscription
  // ---------------------------------------------------------------------------

  describe('getSubscription', () => {
    it('throws NotFoundException when subscription does not exist', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.getSubscription(99n, caller)).rejects.toThrow(NotFoundException)
    })

    it('returns serialized subscription with subscriptionId as string', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub())
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.getSubscription(1n, caller)

      expect(result.data.subscriptionId).toBe('1')
    })

    it('allows member to access own subscription via userId match', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub({ memberId: 10n }))
      const caller = makeCaller({ roles: ['member'], userId: 100n, memberId: 10n })

      await expect(service.getSubscription(1n, caller)).resolves.not.toThrow()
    })

    it('throws ForbiddenException when member accesses another member subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({
          memberId: 99n,
          member: {
            memberCode: 'MEM-099',
            userId: 999n,
            primaryTrainerId: null,
            user: { userId: 999n, fullName: 'Other', emailVerifiedAt: new Date() },
          },
        })
      )
      const caller = makeCaller({ roles: ['member'], userId: 100n, memberId: 10n })

      await expect(service.getSubscription(1n, caller)).rejects.toThrow(ForbiddenException)
    })
  })

  // ---------------------------------------------------------------------------
  // cancelSubscription
  // ---------------------------------------------------------------------------

  describe('cancelSubscription', () => {
    it('throws NotFoundException when subscription does not exist', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.cancelSubscription(99n, caller)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when subscription is already cancelled', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.cancelled })
      )
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.cancelSubscription(1n, caller)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when subscription is expired', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.expired })
      )
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.cancelSubscription(1n, caller)).rejects.toThrow(NotFoundException)
    })

    it('cancels active subscription and returns cancelled status', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub())
      mockPrisma.subscription.update.mockResolvedValue({})
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.cancelSubscription(1n, caller)

      expect(result.data.status).toBe('cancelled')
      expect(result.data.subscriptionId).toBe('1')
    })

    it('cancels pending subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.pending })
      )
      mockPrisma.subscription.update.mockResolvedValue({})
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.cancelSubscription(1n, caller)

      expect(result.data.status).toBe('cancelled')
    })

    it('clears member.primaryTrainerId when subscription had a trainer', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub({ trainerId: 5n }))
      mockPrisma.subscription.update.mockResolvedValue({})
      mockPrisma.member.update.mockResolvedValue({})
      const caller = makeCaller({ roles: ['owner'] })

      await service.cancelSubscription(1n, caller)

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n },
          data: { primaryTrainerId: null },
        })
      )
    })

    it('does NOT update member when subscription has no trainer', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub({ trainerId: null }))
      mockPrisma.subscription.update.mockResolvedValue({})
      const caller = makeCaller({ roles: ['owner'] })

      await service.cancelSubscription(1n, caller)

      expect(mockPrisma.member.update).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // listSubscriptions
  // ---------------------------------------------------------------------------

  describe('listSubscriptions', () => {
    beforeEach(() => {
      mockPrisma.subscription.findMany.mockResolvedValue([])
      mockPrisma.subscription.count.mockResolvedValue(0)
    })

    it('owner sees all subscriptions without memberId filter', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listSubscriptions({}, caller)

      const whereArg = mockPrisma.subscription.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('owner can filter by memberId', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listSubscriptions({ memberId: 10 }, caller)

      const whereArg = mockPrisma.subscription.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('member sees only own subscriptions', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listSubscriptions({}, caller)

      const whereArg = mockPrisma.subscription.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('member throws ForbiddenException when filtering by another memberId', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await expect(service.listSubscriptions({ memberId: 99 }, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('member without caller.memberId resolves memberId from DB', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await service.listSubscriptions({}, caller)

      expect(mockPrisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: caller.userId }) })
      )
    })

    it('member without caller.memberId and no DB record throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await expect(service.listSubscriptions({}, caller)).rejects.toThrow(ForbiddenException)
    })

    it('trainer without staffId throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.listSubscriptions({}, caller)).rejects.toThrow(ForbiddenException)
    })

    it('trainer with staffId filters by trainerId', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: '5' as any })

      await service.listSubscriptions({}, caller)

      const whereArg = mockPrisma.subscription.findMany.mock.calls[0][0].where
      expect(whereArg.trainerId).toBe(caller.staffId)
    })

    it('returns pagination meta', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([makeSub()])
      mockPrisma.subscription.count.mockResolvedValue(1)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.listSubscriptions({ page: 2, pageSize: 5 }, caller)

      expect(result.meta).toEqual(expect.objectContaining({ page: 2, pageSize: 5, totalItems: 1 }))
    })

    it('serializes subscriptionId as string in list results', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([makeSub()])
      mockPrisma.subscription.count.mockResolvedValue(1)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.listSubscriptions({}, caller)

      expect(typeof result.data[0].subscriptionId).toBe('string')
    })

    it('unknown role throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['unknown_role' as any] })

      await expect(service.listSubscriptions({}, caller)).rejects.toThrow(ForbiddenException)
    })
  })

  // ---------------------------------------------------------------------------
  // External dependency failures (Phase 8)
  // ---------------------------------------------------------------------------

  describe('createSubscription — $transaction failure', () => {
    it('propagates error when $transaction throws mid-flight', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        user: { emailVerifiedAt: new Date() },
      })
      mockPrisma.package.findFirst.mockResolvedValue({
        packageId: 1n,
        durationDays: 30,
        includesPt: false,
        status: 'active',
        deletedAt: null,
      })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockRejectedValue(new Error('DB write failed'))
      const caller = makeCaller()

      await expect(
        service.createSubscription({ memberId: '10', packageId: '1' } as any, caller)
      ).rejects.toThrow('DB write failed')
    })
  })
})
