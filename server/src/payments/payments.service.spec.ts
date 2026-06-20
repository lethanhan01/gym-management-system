import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PaymentsService } from './payments.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(overrides: object = {}) {
  return {
    subscriptionId: 1n,
    memberId: 10n,
    packageId: 1n,
    startDate: new Date('2020-01-01'), // past date — activatable by default
    endDate: new Date('2020-01-31'),
    status: SubscriptionStatus.pending,
    deletedAt: null,
    package: { name: 'Basic', price: { toFixed: (_n: number) => '500000.00' } },
    member: { user: { fullName: 'Test Member', emailVerifiedAt: new Date() } },
    ...overrides,
  }
}

function makePayment(overrides: object = {}) {
  return {
    paymentId: 100n,
    memberId: 10n,
    subscriptionId: 1n,
    amount: { toFixed: (_n: number) => '500000.00' },
    method: PaymentMethod.cash,
    status: PaymentStatus.success,
    transactionReference: null,
    paidAt: new Date(),
    ...overrides,
  }
}

function makeCaller(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 200n,
    email: 'caller@gym.local',
    roles: ['owner'],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPayment = makePayment()
const mockSub = makeSub()

const mockPrisma = {
  member: {
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  paymentAccount: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PaymentsService', () => {
  let service: PaymentsService

  beforeEach(() => {
    service = new PaymentsService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()

    // Default $transaction passthrough
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const txPayment = {
        create: jest.fn().mockResolvedValue(mockPayment),
      }
      const txSubscription = {
        update: jest.fn().mockResolvedValue(mockSub),
      }
      return fn({ payment: txPayment, subscription: txSubscription })
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // createPayment
  // ─────────────────────────────────────────────────────────────────

  describe('createPayment', () => {
    const dto = {
      memberId: '10',
      subscriptionId: '1',
      amount: 500000,
      method: PaymentMethod.cash,
    }

    it('throws BadRequestException when subscription not found', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when sub.memberId does not match dto.memberId', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ memberId: 99n }) // different member
      )
      const caller = makeCaller()

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when subscription is not pending — message contains current status', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.active })
      )
      const caller = makeCaller()

      const err = await service.createPayment(dto as any, caller).catch((e) => e)

      expect(err).toBeInstanceOf(ConflictException)
      const response = err.getResponse() as { message: string }
      expect(response.message).toContain('active')
    })

    it('throws ForbiddenException when member tries to pay for another member', async () => {
      // caller is member with memberId=99 — dto.memberId is 10
      const caller = makeCaller({ roles: ['member'], memberId: 99n })
      // resolveCallerMemberId returns caller.memberId directly
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub())

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(ForbiddenException)
    })

    it('happy path: payment created + subscription activated when startDate <= today and no active sub', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') })) // sub lookup
        .mockResolvedValueOnce(null) // no active other sub

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(true)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'subscription.activate' })
      )
    })

    it('happy path: payment created but NOT activated when another active subscription exists', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') })) // sub lookup
        .mockResolvedValueOnce({ subscriptionId: 999n, status: 'active' }) // active other sub

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(false)
    })

    it('happy path: payment created but NOT activated when startDate is in the future', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: futureDate })) // startDate > today
        .mockResolvedValueOnce(null)

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(false)
    })

    it('propagates P2002 error from prisma on duplicate transactionReference', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') }))
        .mockResolvedValueOnce(null)

      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
      mockPrisma.$transaction.mockRejectedValueOnce(p2002)

      const caller = makeCaller()
      await expect(
        service.createPayment({ ...dto, transactionReference: 'TXN-001' } as any, caller)
      ).rejects.toMatchObject({ code: 'P2002' })
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // listPayments
  // ─────────────────────────────────────────────────────────────────

  describe('listPayments', () => {
    const mockPaymentRow = {
      paymentId: 100n,
      memberId: 10n,
      subscriptionId: 1n,
      amount: { toFixed: (_n: number) => '500000.00' },
      method: PaymentMethod.cash,
      status: PaymentStatus.success,
      transactionReference: null,
      paidAt: new Date(),
      subscription: {
        package: { name: 'Basic' },
      },
    }

    beforeEach(() => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPaymentRow])
      mockPrisma.payment.count.mockResolvedValue(1)
    })

    it('owner sees all payments without memberId filter by default', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('owner can filter by memberId', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listPayments({ memberId: 10 } as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('staff sees all payments like owner', async () => {
      const caller = makeCaller({ roles: ['staff'] })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('member sees only own payments — memberId forced to self', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('member filtering by another memberId throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await expect(service.listPayments({ memberId: 99 } as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('trainer sees payments for members they manage', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.member).toEqual({ primaryTrainerId: 5n })
    })

    it('trainer filters by specific memberId: asserts ownership then sets filter', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 5n })
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listPayments({ memberId: 10 } as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('trainer accessing member they do not manage throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 99n })
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.listPayments({ memberId: 10 } as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('unknown role throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['unknown_role' as any] })

      await expect(service.listPayments({} as any, caller)).rejects.toThrow(ForbiddenException)
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // payment account methods
  // ─────────────────────────────────────────────────────────────────

  function makeAccount(overrides: object = {}) {
    return {
      accountId: 1,
      memberId: 10n,
      type: 'bank',
      provider: 'VCB',
      accountRef: '123456',
      label: 'VCB chính',
      isDefault: false,
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      ...overrides,
    }
  }

  describe('listPaymentAccounts', () => {
    it('returns accounts for the given memberId', async () => {
      mockPrisma.paymentAccount.findMany.mockResolvedValue([makeAccount()])

      const result = await service.listPaymentAccounts(10n)

      expect(result.accounts).toHaveLength(1)
      expect(mockPrisma.paymentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { memberId: 10n, deletedAt: null } })
      )
    })

    it('returns empty array when no accounts exist', async () => {
      mockPrisma.paymentAccount.findMany.mockResolvedValue([])

      const result = await service.listPaymentAccounts(10n)

      expect(result.accounts).toEqual([])
    })
  })

  describe('createPaymentAccount', () => {
    it('does not call updateMany when isDefault=false', async () => {
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount())

      await service.createPaymentAccount(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
        isDefault: false,
      } as any)

      expect(mockPrisma.paymentAccount.updateMany).not.toHaveBeenCalled()
    })

    it('clears all defaults before creating when isDefault=true', async () => {
      mockPrisma.paymentAccount.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount({ isDefault: true }))

      await service.createPaymentAccount(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
        isDefault: true,
      } as any)

      expect(mockPrisma.paymentAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n, deletedAt: null },
          data: { isDefault: false },
        })
      )
      expect(mockPrisma.paymentAccount.create).toHaveBeenCalled()
    })

    it('returns the created account', async () => {
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount({ accountId: 5 }))

      const result = await service.createPaymentAccount(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
      } as any)

      expect(result.account.accountId).toBe(5)
    })
  })

  describe('setDefaultPaymentAccount', () => {
    it('clears all defaults then sets given accountId as default', async () => {
      mockPrisma.paymentAccount.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.paymentAccount.update.mockResolvedValue(makeAccount({ isDefault: true }))

      const result = await service.setDefaultPaymentAccount(10n, 1)

      expect(mockPrisma.paymentAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n, deletedAt: null },
          data: { isDefault: false },
        })
      )
      expect(mockPrisma.paymentAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { accountId: 1 }, data: { isDefault: true } })
      )
      expect(result.account.isDefault).toBe(true)
    })
  })

  describe('removePaymentAccount', () => {
    it('throws NotFoundException when account does not exist', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(null)

      await expect(service.removePaymentAccount(10n, 99)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when memberId does not match', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 99n }))

      await expect(service.removePaymentAccount(10n, 1)).rejects.toThrow(ForbiddenException)
    })

    it('sets deletedAt on the account', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 10n }))
      mockPrisma.paymentAccount.update.mockResolvedValue(undefined)

      await service.removePaymentAccount(10n, 1)

      expect(mockPrisma.paymentAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('returns { success: true } on successful removal', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 10n }))
      mockPrisma.paymentAccount.update.mockResolvedValue(undefined)

      const result = await service.removePaymentAccount(10n, 1)

      expect(result).toEqual({ success: true })
    })
  })
})
