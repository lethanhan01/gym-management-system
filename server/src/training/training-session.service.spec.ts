import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainingSessionService } from './training-session.service'
import { TrainingCaller } from './training.types'

describe('TrainingSessionService', () => {
  let service: TrainingSessionService
  let mockPrisma: any
  let mockAudit: { log: jest.Mock }
  let mockCallerResolver: {
    resolveStaffId: jest.Mock
    resolveMemberId: jest.Mock
    isOwnerOrStaff: jest.Mock
    isTrainerOnly: jest.Mock
    isMemberOnly: jest.Mock
    checkSessionAccess: jest.Mock
  }
  let mockScheduling: {
    checkOverlap: jest.Mock
    resolveSessionPlanLink: jest.Mock
  }
  let mockPresenter: { serializeSession: jest.Mock }
  let mockNotifications: {
    notifyCreated: jest.Mock
    notifyUpdated: jest.Mock
    notifyCancelled: jest.Mock
    notifyCompleted: jest.Mock
  }

  const makeCaller = (overrides: Partial<TrainingCaller> = {}): TrainingCaller => ({
    userId: 1n,
    roles: ['owner'],
    ...overrides,
  })

  const futureTime = (minsFromNow: number) =>
    new Date(Date.now() + minsFromNow * 60 * 1000)

  beforeEach(() => {
    mockPrisma = {
      trainingSession: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      member: { findFirst: jest.fn() },
      staff: { findFirst: jest.fn() },
      gymRoom: { findFirst: jest.fn() },
      subscription: { findFirst: jest.fn() },
    }
    mockAudit = { log: jest.fn() }
    mockCallerResolver = {
      resolveStaffId: jest.fn().mockResolvedValue(20n),
      resolveMemberId: jest.fn().mockResolvedValue(10n),
      isOwnerOrStaff: jest.fn().mockReturnValue(true),
      isTrainerOnly: jest.fn().mockReturnValue(false),
      isMemberOnly: jest.fn().mockReturnValue(false),
      checkSessionAccess: jest.fn(),
    }
    mockScheduling = {
      checkOverlap: jest.fn().mockResolvedValue(undefined),
      resolveSessionPlanLink: jest.fn().mockResolvedValue(null),
    }
    mockPresenter = {
      serializeSession: jest.fn((s) => ({ ...s, sessionId: s.sessionId?.toString() ?? '1' })),
    }
    mockNotifications = {
      notifyCreated: jest.fn().mockResolvedValue(undefined),
      notifyUpdated: jest.fn().mockResolvedValue(undefined),
      notifyCancelled: jest.fn().mockResolvedValue(undefined),
      notifyCompleted: jest.fn().mockResolvedValue(undefined),
    }

    service = new TrainingSessionService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockCallerResolver as unknown as TrainingCallerResolverService,
      mockScheduling as unknown as TrainingSessionSchedulingService,
      mockPresenter as unknown as TrainingSessionPresenter,
      mockNotifications as unknown as TrainingSessionNotificationService
    )
  })

  describe('listSessions', () => {
    it('throws ForbiddenException when memberOnly caller has no member profile', async () => {
      mockCallerResolver.isMemberOnly.mockReturnValue(true)
      mockCallerResolver.resolveMemberId.mockResolvedValue(null)

      await expect(
        service.listSessions({}, makeCaller({ roles: ['member'], memberId: undefined }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ForbiddenException when trainerOnly caller has no staff profile', async () => {
      mockCallerResolver.isTrainerOnly.mockReturnValue(true)
      mockCallerResolver.resolveStaffId.mockResolvedValue(null)

      await expect(
        service.listSessions({}, makeCaller({ roles: ['trainer'], staffId: undefined }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('returns serialized sessions and meta pagination', async () => {
      mockCallerResolver.isMemberOnly.mockReturnValue(false)
      mockCallerResolver.isTrainerOnly.mockReturnValue(false)
      mockPrisma.trainingSession.findMany.mockResolvedValue([
        { sessionId: 1n, roomId: 2n, startTime: new Date() },
      ])
      mockPrisma.trainingSession.count.mockResolvedValue(1)

      const res = await service.listSessions(
        { page: 1, pageSize: 10, roomId: '2', status: 'scheduled', sort: 'start_time:desc' },
        makeCaller()
      )

      expect(res.data).toHaveLength(1)
      expect(res.meta.totalItems).toBe(1)
      expect(res.meta.totalPages).toBe(1)
    })
  })

  describe('getSession', () => {
    it('throws NotFoundException if session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(service.getSession(1n, makeCaller())).rejects.toThrow(NotFoundException)
    })

    it('checks session access and returns serialized session', async () => {
      const session = { sessionId: 1n, memberId: 10n, trainerStaffId: 20n }
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)

      const res = await service.getSession(1n, makeCaller())

      expect(mockCallerResolver.checkSessionAccess).toHaveBeenCalledWith(session, expect.any(Object))
      expect(res.data.sessionId).toBe('1')
    })
  })

  describe('createSession', () => {
    const validStart = futureTime(60)
    const validEnd = new Date(validStart.getTime() + 60 * 60 * 1000)

    it('throws BadRequestException when endTime <= startTime', async () => {
      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            trainerStaffId: '20',
            startTime: validEnd.toISOString(),
            endTime: validStart.toISOString(),
          },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws BadRequestException when startTime is in past', async () => {
      const pastTime = new Date(Date.now() - 10 * 60 * 1000)
      const pastEnd = new Date(pastTime.getTime() + 60 * 60 * 1000)

      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            trainerStaffId: '20',
            startTime: pastTime.toISOString(),
            endTime: pastEnd.toISOString(),
          },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws BadRequestException (FK_CONSTRAINT) when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            trainerStaffId: '20',
            startTime: validStart.toISOString(),
            endTime: validEnd.toISOString(),
          },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('throws BadRequestException (FK_CONSTRAINT) when room does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            trainerStaffId: '20',
            startTime: validStart.toISOString(),
            endTime: validEnd.toISOString(),
          },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('trainer caller throws ForbiddenException if member has different primary trainer', async () => {
      mockCallerResolver.isTrainerOnly.mockReturnValue(true)
      mockCallerResolver.resolveStaffId.mockResolvedValue(20n)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 99n })
      mockPrisma.gymRoom.findFirst.mockResolvedValue({ roomId: 1n })

      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            startTime: validStart.toISOString(),
            endTime: validEnd.toISOString(),
          },
          makeCaller({ roles: ['trainer'] })
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TRAINER_NOT_ASSIGNED' }),
      })
    })

    it('throws ConflictException when member has no active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.gymRoom.findFirst.mockResolvedValue({ roomId: 1n })
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 20n })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      await expect(
        service.createSession(
          {
            memberId: '10',
            roomId: '1',
            trainerStaffId: '20',
            startTime: validStart.toISOString(),
            endTime: validEnd.toISOString(),
          },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('successfully creates session and sends notifications', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.gymRoom.findFirst.mockResolvedValue({ roomId: 1n })
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 20n })
      mockPrisma.subscription.findFirst.mockResolvedValue({ subscriptionId: 1n })
      mockPrisma.trainingSession.create.mockResolvedValue({
        sessionId: 50n,
        memberId: 10n,
        trainerStaffId: 20n,
        roomId: 1n,
      })

      const res = await service.createSession(
        {
          memberId: '10',
          roomId: '1',
          trainerStaffId: '20',
          startTime: validStart.toISOString(),
          endTime: validEnd.toISOString(),
        },
        makeCaller()
      )

      expect(res.data.sessionId).toBe('50')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.create' })
      )
      expect(mockNotifications.notifyCreated).toHaveBeenCalled()
    })
  })

  describe('updateSession', () => {
    const validStart = futureTime(120)
    const validEnd = new Date(validStart.getTime() + 60 * 60 * 1000)

    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(
        service.updateSession(1n, { roomId: '2' }, makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when trainer modifies other trainer session', async () => {
      mockCallerResolver.isTrainerOnly.mockReturnValue(true)
      mockCallerResolver.resolveStaffId.mockResolvedValue(20n)
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 1n,
        trainerStaffId: 99n,
        startTime: validStart,
        endTime: validEnd,
      })

      await expect(
        service.updateSession(1n, { roomId: '2' }, makeCaller({ roles: ['trainer'] }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ConflictException when session is already started or completed', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 1n,
        trainerStaffId: 20n,
        status: 'completed',
        startTime: validStart,
        endTime: validEnd,
      })

      await expect(
        service.updateSession(1n, { roomId: '2' }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_ALREADY_STARTED' }),
      })
    })

    it('happy path updates session, logs audit, and sends update notification', async () => {
      const session = {
        sessionId: 1n,
        trainerStaffId: 20n,
        roomId: 1n,
        status: 'scheduled',
        startTime: validStart,
        endTime: validEnd,
      }
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({ ...session, roomId: 2n })

      const res = await service.updateSession(1n, { roomId: '2' }, makeCaller())

      expect(res.data.sessionId).toBe('1')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.update' })
      )
      expect(mockNotifications.notifyUpdated).toHaveBeenCalled()
    })
  })

  describe('cancelSession', () => {
    it('throws NotFoundException if session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(
        service.cancelSession(1n, { reason: 'Cancelled' }, makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException if session is already completed or cancelled', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 1n,
        status: 'cancelled',
      })
      await expect(
        service.cancelSession(1n, { reason: 'Cancelled' }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_NOT_CANCELLABLE' }),
      })
    })

    it('happy path cancels session, logs audit, and sends notification', async () => {
      const session = { sessionId: 1n, trainerStaffId: 20n, status: 'scheduled' }
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({ ...session, status: 'cancelled' })

      await service.cancelSession(1n, { reason: 'PT Unavailable' }, makeCaller())

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.cancel' })
      )
      expect(mockNotifications.notifyCancelled).toHaveBeenCalled()
    })
  })

  describe('updateSessionStatus', () => {
    it('throws NotFoundException if session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(
        service.updateSessionStatus(1n, 'in_progress', makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException (SESSION_ALREADY_FINISHED) when session is already finished', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 1n,
        status: 'completed',
      })
      await expect(
        service.updateSessionStatus(1n, 'in_progress', makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_ALREADY_FINISHED' }),
      })
    })

    it('throws ConflictException (INVALID_STATUS_TRANSITION) when status=in_progress but session is already in_progress', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        sessionId: 1n,
        status: 'in_progress',
      })
      await expect(
        service.updateSessionStatus(1n, 'in_progress', makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
      })
    })

    it('happy path updates status to completed, calls notifyCompleted, and logs audit', async () => {
      const session = { sessionId: 1n, trainerStaffId: 20n, status: 'in_progress' }
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({ ...session, status: 'completed' })

      const res = await service.updateSessionStatus(1n, 'completed', makeCaller())

      expect(res.data.sessionId).toBe('1')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.status.completed' })
      )
      expect(mockNotifications.notifyCompleted).toHaveBeenCalled()
    })
  })
})
