import { SubscriptionScheduleService } from './subscription-schedule.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSubWithPayment(overrides: object = {}) {
  return { subscriptionId: 1n, payments: [{ paymentId: 100n }], ...overrides }
}

function makeSubWithoutPayment(overrides: object = {}) {
  return { subscriptionId: 2n, payments: [], ...overrides }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  subscription: {
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  member: {
    updateMany: jest.fn(),
  },
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SubscriptionScheduleService', () => {
  let service: SubscriptionScheduleService

  beforeEach(() => {
    service = new SubscriptionScheduleService(mockPrisma as any)
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // expireSubscriptions
  // -------------------------------------------------------------------------

  describe('expireSubscriptions', () => {
    it('calls updateMany with status=expired for active subscriptions past endDate', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 3 })

      await service.expireSubscriptions()

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active', deletedAt: null }),
          data: { status: 'expired' },
        })
      )
    })

    it('resets primaryTrainerId for members whose PT subscription expired', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { memberId: 10n },
        { memberId: 20n },
      ])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.member.updateMany.mockResolvedValue({ count: 2 })

      await service.expireSubscriptions()

      expect(mockPrisma.member.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: { in: [10n, 20n] } },
          data: { primaryTrainerId: null },
        })
      )
    })

    it('does not call member.updateMany when no PT subs expired', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      await service.expireSubscriptions()

      expect(mockPrisma.member.updateMany).not.toHaveBeenCalled()
    })

    it('does not throw when count=0 (no subscriptions to expire)', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.expireSubscriptions()).resolves.toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // activatePendingSubscriptions
  // -------------------------------------------------------------------------

  describe('activatePendingSubscriptions', () => {
    it('activates only pending subs that have a successful payment', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubWithPayment({ subscriptionId: 1n }),
        makeSubWithoutPayment({ subscriptionId: 2n }),
      ])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      await service.activatePendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subscriptionId: { in: [1n] } },
          data: { status: 'active' },
        })
      )
    })

    it('does not call updateMany when no pending subs have a successful payment', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubWithoutPayment({ subscriptionId: 2n }),
      ])

      await service.activatePendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled()
    })

    it('does not call updateMany when no pending subs exist', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      await service.activatePendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // cancelUnpaidPendingSubscriptions
  // -------------------------------------------------------------------------

  describe('cancelUnpaidPendingSubscriptions', () => {
    it('cancels pending subs older than 24h with no successful payment', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubWithoutPayment({ subscriptionId: 3n }),
      ])
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      await service.cancelUnpaidPendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subscriptionId: { in: [3n] } },
          data: expect.objectContaining({
            status: 'cancelled',
            cancelledAt: expect.any(Date),
          }),
        })
      )
    })

    it('does not cancel subs that have a successful payment', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubWithPayment({ subscriptionId: 1n }),
      ])

      await service.cancelUnpaidPendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled()
    })

    it('does not call updateMany when no pending subs older than 24h exist', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      await service.cancelUnpaidPendingSubscriptions()

      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled()
    })
  })
})
