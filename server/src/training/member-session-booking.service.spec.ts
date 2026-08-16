import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { MemberSessionBookingService } from './member-session-booking.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainingCaller } from './training.types'

describe('MemberSessionBookingService', () => {
  let service: MemberSessionBookingService
  let mockPrisma: any
  let mockAudit: { log: jest.Mock }
  let mockCallerResolver: { resolveMemberId: jest.Mock }
  let mockScheduling: {
    checkOverlap: jest.Mock
    findAvailableRoom: jest.Mock
    resolveSessionPlanLink: jest.Mock
  }
  let mockPresenter: { serializeSession: jest.Mock }
  let mockNotifications: { notifyCreated: jest.Mock; notifyCancelled: jest.Mock }

  const makeCaller = (overrides: Partial<TrainingCaller> = {}): TrainingCaller => ({
    userId: 101n,
    roles: ['member'],
    memberId: 10n,
    ...overrides,
  })

  const futureTime = (minsFromNow: number) =>
    new Date(Date.now() + minsFromNow * 60 * 1000)

  beforeEach(() => {
    mockPrisma = {
      member: { findFirst: jest.fn() },
      trainingSession: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      subscription: { findFirst: jest.fn() },
      gymRoom: { findMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    }
    mockAudit = { log: jest.fn() }
    mockCallerResolver = { resolveMemberId: jest.fn().mockResolvedValue(10n) }
    mockScheduling = {
      checkOverlap: jest.fn().mockResolvedValue(undefined),
      findAvailableRoom: jest.fn().mockResolvedValue({ roomId: 1n, name: 'Room 1' }),
      resolveSessionPlanLink: jest.fn().mockResolvedValue(null),
    }
    mockPresenter = {
      serializeSession: jest.fn((s) => ({ ...s, sessionId: s.sessionId?.toString() ?? '1' })),
    }
    mockNotifications = {
      notifyCreated: jest.fn().mockResolvedValue(undefined),
      notifyCancelled: jest.fn().mockResolvedValue(undefined),
    }

    service = new MemberSessionBookingService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockCallerResolver as unknown as TrainingCallerResolverService,
      mockScheduling as unknown as TrainingSessionSchedulingService,
      mockPresenter as unknown as TrainingSessionPresenter,
      mockNotifications as unknown as TrainingSessionNotificationService
    )
  })

  describe('getTrainerAvailability', () => {
    it('throws ForbiddenException when memberId cannot be resolved', async () => {
      mockCallerResolver.resolveMemberId.mockResolvedValue(null)
      await expect(
        service.getTrainerAvailability({ date: '2026-08-20' }, makeCaller())
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException when member profile does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      await expect(
        service.getTrainerAvailability({ date: '2026-08-20' }, makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when member has no primary trainer', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: null,
        primaryTrainer: null,
      })
      await expect(
        service.getTrainerAvailability({ date: '2026-08-20' }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NO_PRIMARY_TRAINER' }),
      })
    })

    it('returns 15 slots with availability and trainer info', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 20n,
        primaryTrainer: {
          staffId: 20n,
          user: { fullName: 'Coach Sarah', avatarFileId: 5n },
        },
      })
      mockPrisma.trainingSession.findMany
        .mockResolvedValueOnce([]) // trainer sessions
        .mockResolvedValueOnce([]) // member sessions

      const res = await service.getTrainerAvailability({ date: '2026-08-25' }, makeCaller())

      expect(res.date).toBe('2026-08-25')
      expect(res.trainer.fullName).toBe('Coach Sarah')
      expect(res.slots).toHaveLength(15)
    })
  })

  describe('bookSessionByMember', () => {
    const validStart = futureTime(60 * 24) // 1 day in future
    const validEnd = new Date(validStart.getTime() + 60 * 60 * 1000)

    it('throws ForbiddenException if memberId is not resolved', async () => {
      mockCallerResolver.resolveMemberId.mockResolvedValue(null)
      await expect(
        service.bookSessionByMember(
          { startTime: validStart.toISOString(), endTime: validEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException (INVALID_DURATION) when session is not 60m', async () => {
      const invalidEnd = new Date(validStart.getTime() + 45 * 60 * 1000)
      await expect(
        service.bookSessionByMember(
          { startTime: validStart.toISOString(), endTime: invalidEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_DURATION' }),
      })
    })

    it('throws BadRequestException (INVALID_BOOKING_TIME) when booking too far in advance', async () => {
      const eightDaysAhead = futureTime(8 * 24 * 60)
      const eightDaysEnd = new Date(eightDaysAhead.getTime() + 60 * 60 * 1000)
      await expect(
        service.bookSessionByMember(
          { startTime: eightDaysAhead.toISOString(), endTime: eightDaysEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_BOOKING_TIME' }),
      })
    })

    it('throws BadRequestException (BOOKING_LIMIT_EXCEEDED) when member already has 3 sessions', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 20n,
        primaryTrainer: { staffId: 20n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(3)

      await expect(
        service.bookSessionByMember(
          { startTime: validStart.toISOString(), endTime: validEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'BOOKING_LIMIT_EXCEEDED' }),
      })
    })

    it('throws ConflictException (MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION) when no active sub', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 20n,
        primaryTrainer: { staffId: 20n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      await expect(
        service.bookSessionByMember(
          { startTime: validStart.toISOString(), endTime: validEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('throws ConflictException (NO_ROOM_AVAILABLE) when scheduling cannot find a room', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 20n,
        primaryTrainer: { staffId: 20n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.subscription.findFirst.mockResolvedValue({ subscriptionId: 1n })
      mockScheduling.findAvailableRoom.mockResolvedValue(null)

      await expect(
        service.bookSessionByMember(
          { startTime: validStart.toISOString(), endTime: validEnd.toISOString() },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NO_ROOM_AVAILABLE' }),
      })
    })

    it('successfully books session, logs audit, and sends notification', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 20n,
        primaryTrainer: { staffId: 20n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(1)
      mockPrisma.subscription.findFirst.mockResolvedValue({ subscriptionId: 1n })
      mockScheduling.findAvailableRoom.mockResolvedValue({ roomId: 5n, name: 'Room 5' })
      mockPrisma.trainingSession.create.mockResolvedValue({
        sessionId: 100n,
        memberId: 10n,
        trainerStaffId: 20n,
        roomId: 5n,
      })

      const res = await service.bookSessionByMember(
        { startTime: validStart.toISOString(), endTime: validEnd.toISOString() },
        makeCaller()
      )

      expect(res.data.sessionId).toBe('100')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.member_book' })
      )
      expect(mockNotifications.notifyCreated).toHaveBeenCalled()
    })
  })

  describe('cancelBookingByMember', () => {
    it('throws NotFoundException when session is not found', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(
        service.cancelBookingByMember(1n, { reason: 'Busy' }, makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when member cancels someone else session', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ memberId: 99n })
      await expect(
        service.cancelBookingByMember(1n, { reason: 'Busy' }, makeCaller({ memberId: 10n }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ConflictException when session is not scheduled', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        memberId: 10n,
        status: 'completed',
      })
      await expect(
        service.cancelBookingByMember(1n, { reason: 'Busy' }, makeCaller({ memberId: 10n }))
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_NOT_CANCELLABLE' }),
      })
    })

    it('throws BadRequestException (LATE_CANCELLATION) when session starts in < 2 hours', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        memberId: 10n,
        status: 'scheduled',
        startTime: futureTime(90), // 1.5 hours
      })
      await expect(
        service.cancelBookingByMember(1n, { reason: 'Busy' }, makeCaller({ memberId: 10n }))
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'LATE_CANCELLATION' }),
      })
    })

    it('successfully cancels booking when >= 2 hours', async () => {
      const session = {
        sessionId: 1n,
        memberId: 10n,
        status: 'scheduled',
        startTime: futureTime(180), // 3 hours
      }
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({ ...session, status: 'cancelled' })

      const res = await service.cancelBookingByMember(
        1n,
        { reason: 'Sick' },
        makeCaller({ memberId: 10n })
      )

      expect(res.success).toBe(true)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.member_cancel' })
      )
      expect(mockNotifications.notifyCancelled).toHaveBeenCalled()
    })
  })
})
