import { StaffScheduleService } from './staff-schedule.service'

const mockPrisma: any = {
  staff: { findFirst: jest.fn() },
  staffSchedule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

function makeStaff(overrides: object = {}) {
  return { staffId: 5n, staffCode: 'ST-001', position: 'staff', deletedAt: null, ...overrides }
}

function makeSchedule(overrides: object = {}) {
  return {
    scheduleId: 1n,
    staffId: 5n,
    shift: 'morning',
    workDate: new Date('2099-12-01'),
    deletedAt: null,
    ...overrides,
  }
}

function futureDate(daysFromNow = 30) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

describe('StaffScheduleService', () => {
  let service: StaffScheduleService

  beforeEach(() => {
    service = new StaffScheduleService(mockPrisma, mockAudit as any)
    jest.clearAllMocks()
    mockAudit.log.mockReturnValue(undefined)
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma))
  })

  // ---------------------------------------------------------------------------
  // listSchedules
  // ---------------------------------------------------------------------------

  describe('listSchedules', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.listSchedules(5n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STAFF_NOT_FOUND' }),
      })
    })

    it('returns serialized schedule list', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([makeSchedule()])

      const result = await service.listSchedules(5n)

      expect(result).toHaveLength(1)
      expect(result[0].scheduleId).toBe('1')
      expect(result[0].workDate).toBe('2099-12-01')
    })
  })

  // ---------------------------------------------------------------------------
  // createSchedule
  // ---------------------------------------------------------------------------

  describe('createSchedule', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(
        service.createSchedule(5n, { schedules: [{ shift: 'morning' as any, workDate: futureDate() }] }, 1n)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'STAFF_NOT_FOUND' }) })
    })

    it('throws BadRequestException when staff position is not staff', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ position: 'trainer' }))

      await expect(
        service.createSchedule(5n, { schedules: [{ shift: 'morning' as any, workDate: futureDate() }] }, 1n)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_SCHEDULE_STAFF_POSITION' }),
      })
    })

    it('throws BadRequestException when workDate is in the past', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      await expect(
        service.createSchedule(5n, { schedules: [{ shift: 'morning' as any, workDate: '2000-01-01' }] }, 1n)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('throws BadRequestException on duplicate shift+date in batch', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      const wd = futureDate()

      await expect(
        service.createSchedule(
          5n,
          { schedules: [{ shift: 'morning' as any, workDate: wd }, { shift: 'morning' as any, workDate: wd }] },
          1n,
        )
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('throws ConflictException when schedule conflicts exist in DB', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([makeSchedule()])

      await expect(
        service.createSchedule(5n, { schedules: [{ shift: 'morning' as any, workDate: futureDate() }] }, 1n)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'SCHEDULE_CONFLICT' }) })
    })

    it('happy path: creates schedules and returns count', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany
        .mockResolvedValueOnce([]) // conflict check
        .mockResolvedValueOnce([makeSchedule()]) // tx.findMany
      mockPrisma.staffSchedule.createMany = jest.fn().mockResolvedValue({ count: 1 })

      const result = await service.createSchedule(
        5n,
        { schedules: [{ shift: 'morning' as any, workDate: futureDate() }] },
        1n,
      )

      expect(result.created).toBe(1)
      expect(result.schedules).toHaveLength(1)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'schedule.assign' })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deleteSchedule
  // ---------------------------------------------------------------------------

  describe('deleteSchedule', () => {
    it('throws NotFoundException when schedule not found', async () => {
      mockPrisma.staffSchedule.findFirst.mockResolvedValue(null)

      await expect(service.deleteSchedule(5n, 1n, 1n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SCHEDULE_NOT_FOUND' }),
      })
    })

    it('soft-deletes schedule and calls audit', async () => {
      mockPrisma.staffSchedule.findFirst.mockResolvedValue(makeSchedule())
      mockPrisma.staffSchedule.update.mockResolvedValue({})

      const result = await service.deleteSchedule(5n, 1n, 1n)

      expect(mockPrisma.staffSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scheduleId: 1n }, data: { deletedAt: expect.any(Date) } })
      )
      expect(result.success).toBe(true)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'schedule.remove' })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // listAllSchedules
  // ---------------------------------------------------------------------------

  describe('listAllSchedules', () => {
    it('returns formatted schedule list for date range', async () => {
      const row = {
        scheduleId: 1n,
        staffId: 5n,
        shift: 'morning',
        workDate: new Date('2099-12-01'),
        staff: { staffCode: 'ST-001', user: { fullName: 'Staff A' } },
      }
      mockPrisma.staffSchedule.findMany.mockResolvedValue([row])

      const result = await service.listAllSchedules('2099-12-01', '2099-12-31')

      expect(result).toHaveLength(1)
      expect(result[0].scheduleId).toBe('1')
      expect(result[0].staffCode).toBe('ST-001')
      expect(result[0].fullName).toBe('Staff A')
      expect(result[0].workDate).toBe('2099-12-01')
    })
  })
})
