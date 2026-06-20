import { StaffAttendanceService } from './staff-attendance.service'

const mockPrisma = {
  staffAttendanceLog: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}

const mockAudit = { log: jest.fn() }

function makeLog(overrides: object = {}) {
  return {
    logId: 1n,
    staffId: 5n,
    checkIn: new Date(),
    checkOut: null,
    ...overrides,
  }
}

describe('StaffAttendanceService', () => {
  let service: StaffAttendanceService

  beforeEach(() => {
    service = new StaffAttendanceService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // checkIn
  // ---------------------------------------------------------------------------

  describe('checkIn', () => {
    it('creates a check-in record when no open session exists', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.staffAttendanceLog.create.mockResolvedValue(makeLog())

      const result = await service.checkIn(5n)

      expect(mockPrisma.staffAttendanceLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { staffId: 5n, checkIn: expect.any(Date) } })
      )
      expect(result.checkOut).toBeNull()
    })

    it('throws ConflictException when already checked in today', async () => {
      const todayCheckIn = new Date()
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(makeLog({ checkIn: todayCheckIn }))

      await expect(service.checkIn(5n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ALREADY_CHECKED_IN' }),
      })
    })

    it('deletes stale open session from previous day and creates new check-in', async () => {
      const yesterday = new Date(Date.now() - 86400_000)
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(makeLog({ logId: 99n, checkIn: yesterday }))
      mockPrisma.staffAttendanceLog.delete.mockResolvedValue({})
      mockPrisma.staffAttendanceLog.create.mockResolvedValue(makeLog({ logId: 2n }))

      await service.checkIn(5n)

      expect(mockPrisma.staffAttendanceLog.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { logId: 99n } })
      )
      expect(mockPrisma.staffAttendanceLog.create).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // checkOut
  // ---------------------------------------------------------------------------

  describe('checkOut', () => {
    it('throws ConflictException when no open check-in session', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(null)

      await expect(service.checkOut(5n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_CHECKED_IN' }),
      })
    })

    it('happy path: records check-out and returns duration', async () => {
      const checkIn = new Date(Date.now() - 3600_000)
      const open = makeLog({ logId: 1n, checkIn })
      const checkOut = new Date()
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(open)
      mockPrisma.staffAttendanceLog.update.mockResolvedValue(makeLog({ checkIn, checkOut }))

      const result = await service.checkOut(5n)

      expect(mockPrisma.staffAttendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { logId: 1n }, data: { checkOut: expect.any(Date) } })
      )
      expect(result.durationMinutes).toBeGreaterThan(0)
    })

    it('voids attendance and throws when check-out is on a different day', async () => {
      const yesterday = new Date(Date.now() - 86400_000)
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(makeLog({ logId: 1n, checkIn: yesterday }))
      mockPrisma.staffAttendanceLog.delete.mockResolvedValue({})

      await expect(service.checkOut(5n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ATTENDANCE_VOIDED_DIFFERENT_DAY' }),
      })
      expect(mockPrisma.staffAttendanceLog.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { logId: 1n } })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getMyAttendance
  // ---------------------------------------------------------------------------

  describe('getMyAttendance', () => {
    it('returns paginated attendance list', async () => {
      const log = makeLog({ checkOut: new Date() })
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([log])
      mockPrisma.staffAttendanceLog.count.mockResolvedValue(1)

      const result = await service.getMyAttendance(5n, {} as any)

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.data[0].durationMinutes).toBeGreaterThanOrEqual(0)
    })

    it('uses custom date range and pageSize from dto', async () => {
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([])
      mockPrisma.staffAttendanceLog.count.mockResolvedValue(0)

      await service.getMyAttendance(5n, { from: '2024-01-01', to: '2024-01-31', pageSize: 50 } as any)

      const callArg = (mockPrisma.staffAttendanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.take).toBe(50)
      expect(callArg.where.checkIn.gte).toEqual(new Date('2024-01-01'))
    })
  })
})
