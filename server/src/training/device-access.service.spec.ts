import { DeviceAccessService } from './device-access.service'

const mockPrisma = {
  member: { findFirst: jest.fn() },
  subscription: { findFirst: jest.fn() },
  attendanceLog: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  trainingSession: { findFirst: jest.fn(), update: jest.fn() },
}

const mockAudit = { log: jest.fn() }

let occurredAtCounter = 1000000

function makeBody(overrides: object = {}) {
  occurredAtCounter += 1
  return {
    memberIdentifier: 'MEM-001',
    occurredAt: new Date(occurredAtCounter).toISOString(),
    deviceId: `DEVICE-${occurredAtCounter}`,
    ...overrides,
  }
}

function makeMember() {
  return {
    memberId: 10n,
    memberCode: 'MEM-001',
    deletedAt: null,
    user: { fullName: 'Test Member', avatarFileId: null },
  }
}

function makeSubscription() {
  return {
    subscriptionId: 20n,
    memberId: 10n,
    status: 'active',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2099-12-31'),
    deletedAt: null,
  }
}

function makeAttendanceLog(overrides: object = {}) {
  return { attendanceId: 1n, memberId: 10n, subscriptionId: 20n, ...overrides }
}

describe('DeviceAccessService', () => {
  let service: DeviceAccessService

  beforeEach(() => {
    service = new DeviceAccessService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    mockAudit.log.mockResolvedValue(undefined)
  })

  describe('deviceAccessEvent', () => {
    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.deviceAccessEvent(makeBody())).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when no active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      await expect(service.deviceAccessEvent(makeBody())).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('auto-closes open attendance before creating new one', async () => {
      const body = makeBody()
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 99n, endTime: null })
      mockPrisma.attendanceLog.update.mockResolvedValue({})
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceLog({ attendanceId: 2n }))

      await service.deviceAccessEvent(body)

      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { attendanceId: 99n } })
      )
    })

    it('happy path: creates attendance log, calls audit, returns data', async () => {
      const body = makeBody()
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceLog())

      const result = await service.deviceAccessEvent(body)

      expect(mockPrisma.attendanceLog.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.realtime-checkin' })
      )
      expect(result.success).toBe(true)
      expect(result.data.deduped).toBe(false)
      expect(result.data.attendanceLogId).toBe('1')
    })

    it('updates session to in_progress when matching session found', async () => {
      const body = makeBody()
      const session = { sessionId: 50n, status: 'scheduled' }
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({})
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceLog())

      const result = await service.deviceAccessEvent(body)

      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 50n }, data: { status: 'in_progress' } })
      )
      expect(result.data.sessionId).toBe('50')
    })

    it('deduplication: second call with same key returns deduped:true', async () => {
      const body = makeBody()
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceLog())

      const r1 = await service.deviceAccessEvent(body)
      const r2 = await service.deviceAccessEvent(body)

      expect(r1.data.deduped).toBe(false)
      expect(r2.data.deduped).toBe(true)
    })
  })
})
