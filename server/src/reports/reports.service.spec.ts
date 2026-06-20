import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ReportsService } from './reports.service'

// Fixed past dates — always satisfy the "to ≤ today (VN)" constraint
const FROM = '2024-01-01'
const TO = '2024-01-31'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  payment: { findMany: jest.fn() },
  member: { findMany: jest.fn() },
  subscription: { findMany: jest.fn(), findFirst: jest.fn() },
  staff: { findMany: jest.fn() },
  trainingSession: { count: jest.fn() },
  feedback: { findMany: jest.fn() },
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(() => {
    service = new ReportsService(mockPrisma as any)
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // parseRange — tested indirectly via revenue()
  // -------------------------------------------------------------------------

  describe('parseRange validation', () => {
    it('throws BadRequestException when from is undefined', async () => {
      await expect(service.revenue(undefined, TO)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when to is undefined', async () => {
      await expect(service.revenue(FROM, undefined)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when date format uses slashes', async () => {
      await expect(service.revenue('2024/01/01', TO)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when from > to', async () => {
      await expect(service.revenue('2024-02-01', '2024-01-01')).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when to is a future date', async () => {
      await expect(service.revenue(FROM, '2099-12-31')).rejects.toThrow(BadRequestException)
    })
  })

  // -------------------------------------------------------------------------
  // revenue
  // -------------------------------------------------------------------------

  describe('revenue', () => {
    it('aggregates payments by VN date and returns total', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { paidAt: new Date('2024-01-15T00:00:00+07:00'), amount: new Prisma.Decimal('500000') },
        { paidAt: new Date('2024-01-15T12:00:00+07:00'), amount: new Prisma.Decimal('300000') },
      ])

      const result = await service.revenue(FROM, TO)

      expect(result.data.total).toBe('800000')
      expect(result.data.currency).toBe('VND')
      expect(result.data.breakdown).toHaveLength(1)
      expect(result.data.breakdown[0].date).toBe('2024-01-15')
      expect(result.data.breakdown[0].amount).toBe('800000')
    })

    it('returns total=0 and empty breakdown when no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([])

      const result = await service.revenue(FROM, TO)

      expect(result.data.total).toBe('0')
      expect(result.data.breakdown).toHaveLength(0)
    })

    it('returns correct meta with from/to', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([])

      const result = await service.revenue(FROM, TO)

      expect(result.meta).toEqual({ from: FROM, to: TO })
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.payment.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.revenue(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })

  // -------------------------------------------------------------------------
  // members
  // -------------------------------------------------------------------------

  describe('members', () => {
    it('returns total count and groups by VN date', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { createdAt: new Date('2024-01-10T10:00:00+07:00') },
        { createdAt: new Date('2024-01-10T15:00:00+07:00') },
        { createdAt: new Date('2024-01-20T10:00:00+07:00') },
      ])

      const result = await service.members(FROM, TO)

      expect(result.data.total).toBe(3)
      expect(result.data.breakdown).toHaveLength(2)
      const jan10 = result.data.breakdown.find((b: any) => b.date === '2024-01-10')
      expect(jan10?.count).toBe(2)
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.member.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.members(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })

  // -------------------------------------------------------------------------
  // renewals
  // -------------------------------------------------------------------------

  describe('renewals', () => {
    it('returns renewalRate=1 when all eligible members renewed', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { memberId: 1n, endDate: new Date('2024-01-31') },
      ])
      mockPrisma.subscription.findFirst.mockResolvedValue({ subscriptionId: 2n })

      const result = await service.renewals(FROM, TO)

      expect(result.data.renewalRate).toBe(1)
      expect(result.data.renewed).toBe(1)
      expect(result.data.churned).toBe(0)
    })

    it('returns renewalRate=0 when no member renewed', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { memberId: 1n, endDate: new Date('2024-01-31') },
      ])
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      const result = await service.renewals(FROM, TO)

      expect(result.data.renewalRate).toBe(0)
      expect(result.data.churned).toBe(1)
    })

    it('returns renewalRate=null when no eligible subscriptions', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      const result = await service.renewals(FROM, TO)

      expect(result.data.renewalRate).toBeNull()
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.subscription.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.renewals(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })

  // -------------------------------------------------------------------------
  // staffPerformance
  // -------------------------------------------------------------------------

  describe('staffPerformance', () => {
    it('throws BadRequestException when staffId is not numeric', async () => {
      await expect(service.staffPerformance(FROM, TO, 'abc')).rejects.toThrow(BadRequestException)
    })

    it('accepts numeric staffId without throwing', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
      ])
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.feedback.findMany.mockResolvedValue([])

      await expect(service.staffPerformance(FROM, TO, '1')).resolves.not.toThrow()
    })

    it('sorts rows by completedSessions descending', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
        { staffId: 2n, staffCode: 'ST-002', user: { fullName: 'Trainer B' } },
      ])
      mockPrisma.trainingSession.count.mockResolvedValueOnce(5).mockResolvedValueOnce(10)
      mockPrisma.feedback.findMany.mockResolvedValue([])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].completedSessions).toBe(10)
      expect(result.data[1].completedSessions).toBe(5)
    })

    it('returns avgFeedbackSeverityScore=null when no feedback', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
      ])
      mockPrisma.trainingSession.count.mockResolvedValue(3)
      mockPrisma.feedback.findMany.mockResolvedValue([])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].avgFeedbackSeverityScore).toBeNull()
    })

    it('computes avgFeedbackSeverityScore: high=3, medium=2, low=1', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
      ])
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      // (3 + 1) / 2 = 2
      mockPrisma.feedback.findMany.mockResolvedValue([{ severity: 'high' }, { severity: 'low' }])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].avgFeedbackSeverityScore).toBe(2)
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.staff.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.staffPerformance(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })
})
