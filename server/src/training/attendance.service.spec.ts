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
const mockNotifications = { safeNotifyUser: jest.fn() }
const mockConfig = { get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-jwt-secret' : undefined)) }
const mockLineMessaging = { safePushAttendanceCheckin: jest.fn() }

function makeCaller(overrides: object = {}): any {
  return { userId: 1n, roles: ['owner'], staffId: undefined, memberId: undefined, ...overrides }
}

function makeMember(overrides: object = {}) {
  return {
    memberId: 10n,
    userId: 100n,
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
    member: { memberId: 10n, memberCode: 'MEM-001', userId: 100n, primaryTrainerId: null, user: { fullName: 'Test Member' } },
    subscription: { subscriptionId: 20n, startDate: new Date(), endDate: new Date() },
    session: null,
    ...overrides,
  }
}

describe('AttendanceService', () => {
  let service: AttendanceService

  beforeEach(() => {
    service = new AttendanceService(
      mockPrisma as any,
      mockAudit as any,
      mockNotifications as any,
      mockConfig as any,
      mockLineMessaging as any,
    )
    jest.clearAllMocks()
    mockAudit.log.mockResolvedValue(undefined)
    mockLineMessaging.safePushAttendanceCheckin.mockResolvedValue(false)
  })

  afterEach(() => {
    jest.useRealTimers()
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
      expect(mockPrisma.attendanceLog.create.mock.calls[0][0].data).not.toHaveProperty('qrCheckinDate')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.manual-checkin' })
      )
      expect(result.data.attendanceId).toBe('1')
    })

    it('notifies member and primary trainer with role-specific check-in messages', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ primaryTrainerId: 5n }))
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceRow({
        member: {
          memberId: 10n,
          memberCode: 'MEM-001',
          userId: 100n,
          primaryTrainerId: 5n,
          user: { fullName: 'Test Member' },
        },
      }))
      mockPrisma.staff.findFirst.mockResolvedValue({ userId: 200n })
      const caller = makeCaller()

      await service.manualCheckin(makeDto() as any, caller)

      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        100n,
        expect.objectContaining({ type: 'attendance.checkin', message: 'Ban da check-in thanh cong.' })
      )
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        200n,
        expect.objectContaining({
          type: 'attendance.checkin',
          message: 'Hoc vien Test Member vua check-in.',
          metadata: { memberName: 'Test Member' },
        })
      )
    })

    it('pushes a safe LINE attendance message after manual check-in', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(makeAttendanceRow({ attendanceId: 9n }))
      const caller = makeCaller()

      await service.manualCheckin(makeDto() as any, caller)

      expect(mockLineMessaging.safePushAttendanceCheckin).toHaveBeenCalledWith(9n)
    })
  })

  // ---------------------------------------------------------------------------
  // QR token and qrCheckin
  // ---------------------------------------------------------------------------

  describe('QR check-in', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-21T18:00:00.000Z'))
    })

    it('generates a VN daily QR token and verifies it during qrCheckin', async () => {
      const token = service.generateQrToken()
      expect(token.validDate).toBe('2026-07-22')
      expect(token.payload).toEqual({ version: 'v1', date: '2026-07-22' })
      expect(token.expiresAt).toBe('2026-07-22T16:59:59.999Z')

      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(
        makeAttendanceRow({ attendanceId: 3n, method: 'qr' })
      )
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      const result = await service.qrCheckin({ token: token.token } as any, caller)

      expect(mockPrisma.attendanceLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 10n,
            method: 'qr',
            qrCheckinDate: new Date('2026-07-22'),
          }),
        })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.qr-checkin' })
      )
      expect(result.data.method).toBe('qr')
    })

    it('rejects expired, future, malformed, and bad-signature tokens', async () => {
      const current = service.generateQrToken().token
      const badSignature = current.replace(/\.[^.]+$/, '.bad')

      await expect(service.qrCheckin({ token: 'v1.2026-07-21.bad' } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_TOKEN_EXPIRED' }),
      })
      await expect(service.qrCheckin({ token: 'v1.2026-07-23.bad' } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_TOKEN_INVALID' }),
      })
      await expect(service.qrCheckin({ token: 'not-a-token' } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_TOKEN_INVALID' }),
      })
      await expect(service.qrCheckin({ token: badSignature } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_TOKEN_INVALID' }),
      })
    })

    it('resolves member from caller user, auto-closes open attendance, and LINE failure does not fail', async () => {
      const token = service.generateQrToken()
      mockPrisma.member.findFirst
        .mockResolvedValueOnce({ memberId: 10n })
        .mockResolvedValueOnce(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ attendanceId: 1n, endTime: null })
      mockPrisma.attendanceLog.update.mockResolvedValue({})
      mockPrisma.attendanceLog.create.mockResolvedValue(
        makeAttendanceRow({ attendanceId: 4n, method: 'qr' })
      )
      mockLineMessaging.safePushAttendanceCheckin.mockResolvedValue(false)
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      const result = await service.qrCheckin({ token: token.token } as any, caller)

      expect(mockPrisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1n, deletedAt: null } })
      )
      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { attendanceId: 1n } })
      )
      expect(mockLineMessaging.safePushAttendanceCheckin).toHaveBeenCalledWith(4n)
      expect(result.data.attendanceId).toBe('4')
    })

    it('rejects a second QR check-in on the same VN date without changing attendance or sending notifications', async () => {
      const token = service.generateQrToken()
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 3n })

      await expect(service.qrCheckin({ token: token.token } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_CHECKIN_ALREADY_TODAY' }),
      })

      expect(mockPrisma.subscription.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.attendanceLog.update).not.toHaveBeenCalled()
      expect(mockPrisma.attendanceLog.create).not.toHaveBeenCalled()
      expect(mockAudit.log).not.toHaveBeenCalled()
      expect(mockNotifications.safeNotifyUser).not.toHaveBeenCalled()
      expect(mockLineMessaging.safePushAttendanceCheckin).not.toHaveBeenCalled()
    })

    it('maps a concurrent unique-constraint conflict to the duplicate QR check-in error', async () => {
      const token = service.generateQrToken()
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockRejectedValue({ code: 'P2002' })

      await expect(service.qrCheckin({ token: token.token } as any, makeCaller({ roles: ['member'], memberId: 10n }))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'QR_CHECKIN_ALREADY_TODAY' }),
      })

      expect(mockAudit.log).not.toHaveBeenCalled()
      expect(mockNotifications.safeNotifyUser).not.toHaveBeenCalled()
      expect(mockLineMessaging.safePushAttendanceCheckin).not.toHaveBeenCalled()
    })

    it('uses the new Vietnam calendar date after midnight for QR uniqueness', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create
        .mockResolvedValueOnce(makeAttendanceRow({ attendanceId: 5n, method: 'qr' }))
        .mockResolvedValueOnce(makeAttendanceRow({ attendanceId: 6n, method: 'qr' }))
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      const firstToken = service.generateQrToken()
      await service.qrCheckin({ token: firstToken.token } as any, caller)

      jest.setSystemTime(new Date('2026-07-22T17:00:00.000Z'))
      const secondToken = service.generateQrToken()
      await service.qrCheckin({ token: secondToken.token } as any, caller)

      expect(mockPrisma.attendanceLog.create.mock.calls[0][0].data.qrCheckinDate).toEqual(new Date('2026-07-22'))
      expect(mockPrisma.attendanceLog.create.mock.calls[1][0].data.qrCheckinDate).toEqual(new Date('2026-07-23'))
    })

    it('throws when member profile or active subscription is missing', async () => {
      const token = service.generateQrToken()
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      mockPrisma.member.findFirst.mockResolvedValue(null)
      await expect(service.qrCheckin({ token: token.token } as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_PROFILE_NOT_FOUND' }),
      })

      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      await expect(service.qrCheckin({ token: token.token } as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION' }),
      })
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
