import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common'
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
  subscription: { findMany: jest.fn(), groupBy: jest.fn() },
  package: { findMany: jest.fn() },
  staff: { findMany: jest.fn(), findFirst: jest.fn() },
  staffSchedule: { findMany: jest.fn() },
  staffAttendanceLog: { findMany: jest.fn() },
  trainingSession: { groupBy: jest.fn() },
  feedback: { findMany: jest.fn() },
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(() => {
    jest.resetAllMocks()
    service = new ReportsService(mockPrisma as any)
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
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([{ memberId: 1n, endDate: new Date('2024-01-31') }])
        .mockResolvedValueOnce([{ memberId: 1n, startDate: new Date('2024-02-01') }])

      const result = await service.renewals(FROM, TO)

      expect(result.data.renewalRate).toBe(1)
      expect(result.data.renewed).toBe(1)
      expect(result.data.churned).toBe(0)
    })

    it('returns renewalRate=0 when no member renewed', async () => {
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([{ memberId: 1n, endDate: new Date('2024-01-31') }])
        .mockResolvedValueOnce([])

      const result = await service.renewals(FROM, TO)

      expect(result.data.renewalRate).toBe(0)
      expect(result.data.churned).toBe(1)
    })

    it('returns renewalRate=null when no eligible subscriptions', async () => {
      mockPrisma.subscription.findMany.mockResolvedValueOnce([])

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
      mockPrisma.trainingSession.groupBy.mockResolvedValue([])
      mockPrisma.feedback.findMany.mockResolvedValue([])

      await expect(service.staffPerformance(FROM, TO, '1')).resolves.not.toThrow()
    })

    it('sorts rows by completedSessions descending', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
        { staffId: 2n, staffCode: 'ST-002', user: { fullName: 'Trainer B' } },
      ])
      mockPrisma.trainingSession.groupBy.mockResolvedValue([
        { trainerStaffId: 1n, _count: { _all: 5 } },
        { trainerStaffId: 2n, _count: { _all: 10 } },
      ])
      mockPrisma.feedback.findMany.mockResolvedValue([])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].completedSessions).toBe(10)
      expect(result.data[1].completedSessions).toBe(5)
    })

    it('returns avgFeedbackSeverityScore=null when no feedback', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
      ])
      mockPrisma.trainingSession.groupBy.mockResolvedValue([{ trainerStaffId: 1n, _count: { _all: 3 } }])
      mockPrisma.feedback.findMany.mockResolvedValue([])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].avgFeedbackSeverityScore).toBeNull()
    })

    it('computes avgFeedbackSeverityScore: high=3, medium=2, low=1', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 1n, staffCode: 'ST-001', user: { fullName: 'Trainer A' } },
      ])
      mockPrisma.trainingSession.groupBy.mockResolvedValue([])
      // (3 + 1) / 2 = 2
      mockPrisma.feedback.findMany.mockResolvedValue([
        { subjectStaffId: 1n, severity: 'high' },
        { subjectStaffId: 1n, severity: 'low' },
      ])

      const result = await service.staffPerformance(FROM, TO)

      expect(result.data[0].avgFeedbackSeverityScore).toBe(2)
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.staff.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.staffPerformance(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })

  // -------------------------------------------------------------------------
  // employeePerformance
  // -------------------------------------------------------------------------

  describe('employeePerformance', () => {
    it('summarizes employee attendance and feedback, then sorts by performance', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        {
          staffId: 2n,
          staffCode: 'EMP-002',
          position: 'receptionist',
          user: { fullName: 'Employee B' },
        },
        {
          staffId: 1n,
          staffCode: 'EMP-001',
          position: 'cashier',
          user: { fullName: 'Employee A' },
        },
      ])
      mockPrisma.staffSchedule.findMany.mockResolvedValue([{ staffId: 1n, shift: 'morning' }])
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([
        {
          staffId: 1n,
          checkIn: new Date('2024-01-10T07:00:00+07:00'),
          checkOut: new Date('2024-01-10T12:00:00+07:00'),
        },
      ])
      mockPrisma.feedback.findMany.mockResolvedValue([
        { subjectStaffId: 1n, severity: 'high' },
        { subjectStaffId: 1n, severity: 'medium' },
      ])

      const result = await service.employeePerformance(FROM, TO)

      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, NOT: { position: 'trainer' } },
        include: { user: true },
      })
      expect(result.data[0]).toMatchObject({
        staffId: '1',
        staffCode: 'EMP-001',
        fullName: 'Employee A',
        position: 'cashier',
        shiftsWorked: 1,
        avgFeedbackSeverityScore: 2.5,
        performancePercent: 100,
        actualMinutes: 300,
        expectedMinutes: 300,
      })
      expect(result.data[1]).toMatchObject({
        staffId: '2',
        avgFeedbackSeverityScore: null,
        performancePercent: 0,
      })
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.staff.findMany.mockRejectedValue(new Error('DB down'))

      await expect(service.employeePerformance(FROM, TO)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  // -------------------------------------------------------------------------
  // employeePerformanceDetail
  // -------------------------------------------------------------------------

  describe('employeePerformanceDetail', () => {
    it('throws BadRequestException when staffId is not numeric', async () => {
      await expect(service.employeePerformanceDetail('abc', FROM, TO)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('throws NotFoundException when staff does not exist', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.employeePerformanceDetail('1', FROM, TO)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('returns staff attendance logs and schedules', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue({
        staffId: 1n,
        staffCode: 'EMP-001',
        position: 'cashier',
        user: { fullName: 'Employee A' },
      })
      mockPrisma.staffSchedule.findMany.mockResolvedValue([
        {
          scheduleId: 10n,
          shift: 'morning',
          workDate: new Date('2024-01-10T00:00:00+07:00'),
        },
      ])
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([
        {
          logId: 20n,
          checkIn: new Date('2024-01-10T07:00:00+07:00'),
          checkOut: new Date('2024-01-10T11:30:00+07:00'),
        },
      ])

      const result = await service.employeePerformanceDetail('1', FROM, TO)

      expect(result.data).toMatchObject({
        staffId: '1',
        staffCode: 'EMP-001',
        fullName: 'Employee A',
        position: 'cashier',
        attendanceLogs: [
          {
            logId: '20',
            date: '2024-01-10',
            durationMinutes: 270,
          },
        ],
        schedules: [
          {
            scheduleId: '10',
            shift: 'morning',
            workDate: '2024-01-10',
          },
        ],
      })
    })
  })

  // -------------------------------------------------------------------------
  // topPackages
  // -------------------------------------------------------------------------

  describe('topPackages', () => {
    it('returns an empty list when there are no subscriptions', async () => {
      mockPrisma.subscription.groupBy.mockResolvedValue([])

      const result = await service.topPackages(FROM, TO)

      expect(result).toEqual({ data: [], meta: { from: FROM, to: TO } })
    })

    it('maps grouped subscriptions to package details', async () => {
      mockPrisma.subscription.groupBy.mockResolvedValue([
        { packageId: 1n, _count: { subscriptionId: 3 } },
        { packageId: 2n, _count: { subscriptionId: 1 } },
      ])
      mockPrisma.package.findMany.mockResolvedValue([
        {
          packageId: 1n,
          name: 'Gold',
          price: new Prisma.Decimal('1200000'),
          durationDays: 30,
        },
      ])

      const result = await service.topPackages(FROM, TO)

      expect(result.data).toEqual([
        {
          packageId: '1',
          name: 'Gold',
          price: '1200000',
          durationDays: 30,
          count: 3,
        },
        {
          packageId: '2',
          name: '—',
          price: '0',
          durationDays: 0,
          count: 1,
        },
      ])
    })

    it('throws InternalServerErrorException on DB error', async () => {
      mockPrisma.subscription.groupBy.mockRejectedValue(new Error('DB down'))

      await expect(service.topPackages(FROM, TO)).rejects.toThrow(InternalServerErrorException)
    })
  })
})
