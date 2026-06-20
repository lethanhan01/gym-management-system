import { AttendanceService } from './attendance.service'

const mockPrisma = {
  attendanceLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  member: { findFirst: jest.fn() },
  subscription: { findFirst: jest.fn() },
  staff: { findFirst: jest.fn() },
}

const mockAudit = { log: jest.fn() }

function makeCaller(overrides: object = {}): any {
  return { userId: 1n, roles: ['owner'], staffId: undefined, memberId: undefined, ...overrides }
}

function makeMember(overrides: object = {}) {
  return {
    memberId: 10n,
    memberCode: 'MEM-001',
    primaryTrainerId: null,
    deletedAt: null,
    user: { fullName: 'Test Member' },
    ...overrides,
  }
}

function makeSubscription(overrides: object = {}) {
  return { subscriptionId: 20n, memberId: 10n, status: 'active', startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'), deletedAt: null, ...overrides }
}

function makeAttendanceRow(overrides: object = {}) {
  return {
    attendanceId: 1n,
    memberId: 10n,
    subscriptionId: 20n,
    sessionId: null,
    startTime: new Date(),
    endTime: null,
    method: 'manual',
    member: { memberId: 10n, memberCode: 'MEM-001', user: { fullName: 'Test Member' } },
    subscription: { subscriptionId: 20n, startDate: new Date(), endDate: new Date() },
    session: null,
    ...overrides,
  }
}

describe('AttendanceService', () => {
  let service: AttendanceService

  beforeEach(() => {
    service = new AttendanceService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    mockAudit.log.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // listAttendance
  // ---------------------------------------------------------------------------

  describe('listAttendance', () => {
    it('owner: returns paginated attendance list', async () => {
      const log = makeAttendanceRow()
      mockPrisma.attendanceLog.findMany.mockResolvedValue([log])
      mockPrisma.attendanceLog.count.mockResolvedValue(1)
      const caller = makeCaller()

      const result = await service.listAttendance({ page: 1, pageSize: 20 } as any, caller)

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalItems).toBe(1)
    })

    it('member only: filters attendance to self memberId', async () => {
      mockPrisma.attendanceLog.findMany.mockResolvedValue([])
      mockPrisma.attendanceLog.count.mockResolvedValue(0)
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listAttendance({} as any, caller)

      const callArg = (mockPrisma.attendanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.memberId).toBe(10n)
    })

    it('member only without memberId: throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await expect(service.listAttendance({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('trainer only with staffId: filters by primary trainer', async () => {
      mockPrisma.attendanceLog.findMany.mockResolvedValue([])
      mockPrisma.attendanceLog.count.mockResolvedValue(0)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listAttendance({} as any, caller)

      const callArg = (mockPrisma.attendanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.member).toEqual({ primaryTrainerId: 5n })
    })

    it('trainer only without staffId: throws ForbiddenException', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.listAttendance({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })
  })

  // ---------------------------------------------------------------------------
  // manualCheckin
  // ---------------------------------------------------------------------------

  describe('manualCheckin', () => {
    function makeDto() {
      return { memberCode: 'MEM-001', occurredAt: new Date().toISOString() }
    }

    it('throws NotFoundException when member not found by memberCode', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.manualCheckin(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when member has no active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.manualCheckin(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('auto-closes open attendance and creates a new one when member has open session', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 1n, endTime: null })
      mockPrisma.attendanceLog.update.mockResolvedValue({})
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceRow({ attendanceId: 2n }))
      const caller = makeCaller()

      const result = await service.manualCheckin(makeDto() as any, caller)

      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { attendanceId: 1n } })
      )
      expect(result.data.attendanceId).toBe('2')
    })

    it('happy path: creates attendance log and calls audit.log', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceRow())
      const caller = makeCaller()

      const result = await service.manualCheckin(makeDto() as any, caller)

      expect(mockPrisma.attendanceLog.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.manual-checkin' })
      )
      expect(result.data.attendanceId).toBe('1')
    })
  })

  // ---------------------------------------------------------------------------
  // checkout
  // ---------------------------------------------------------------------------

  describe('checkout', () => {
    it('throws NotFoundException when attendance log does not exist', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'NOT_FOUND' }) })
    })

    it('throws ConflictException when already checked out', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 1n, startTime: new Date(Date.now() - 3600_000), endTime: new Date(),
      })
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ATTENDANCE_ALREADY_CLOSED' }) })
    })

    it('throws BadRequestException when endedAt <= startTime', async () => {
      const start = new Date()
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 1n, startTime: start, endTime: null,
      })
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date(start.getTime() - 1000).toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('happy path: updates endTime and logs audit', async () => {
      const start = new Date(Date.now() - 3600_000)
      const end = new Date()
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 1n, startTime: start, endTime: null })
      mockPrisma.attendanceLog.update.mockResolvedValue(makeAttendanceRow({ startTime: start, endTime: end }))
      const caller = makeCaller()

      const result = await service.checkout(1n, { endedAt: end.toISOString() } as any, caller)

      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { attendanceId: 1n }, data: { endTime: expect.any(Date) } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.checkout' })
      )
      expect(result.data.attendanceId).toBe('1')
    })
  })
})
