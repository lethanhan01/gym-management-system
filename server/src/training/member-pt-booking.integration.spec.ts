import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TrainingSessionStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { LineMessagingService } from '../line-messaging/line-messaging.service'
import { MemberSessionBookingService } from './member-session-booking.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainerSessionAvailabilityService } from './trainer-session-availability.service'
import { TrainingCaller } from './training.types'

/**
 * Comprehensive Integration Test Suite for Member PT Booking via LINE Rich Menu / LIFF
 * Covers all 10 Business Rules (BR-01 through BR-10), Notification Dispatch,
 * Multi-language Templates (vi / ja), and Cron Reminders.
 */
describe('Member PT Booking Integration Suite (BR-01 -> BR-10 & Notifications)', () => {
  let bookingService: MemberSessionBookingService
  let notificationService: TrainingSessionNotificationService
  let lineMessagingService: LineMessagingService
  let schedulingService: TrainingSessionSchedulingService
  let presenter: TrainingSessionPresenter
  let availabilityService: TrainerSessionAvailabilityService

  let mockPrisma: any
  let mockAudit: { log: jest.Mock }
  let mockCallerResolver: { resolveMemberId: jest.Mock }
  let mockNotifications: {
    safeNotifyUser: jest.Mock
    safeNotifyManyUsers: jest.Mock
  }
  let mockConfig: { get: jest.Mock }

  const makeCaller = (overrides: Partial<TrainingCaller> = {}): TrainingCaller => ({
    userId: 101n,
    roles: ['member'],
    memberId: 10n,
    ...overrides,
  })

  // Helper to generate ISO date strings relative to now
  const addHours = (hours: number): string =>
    new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
  const addDays = (days: number, hourOfDay = 10): string => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setUTCHours(hourOfDay, 0, 0, 0)
    return d.toISOString()
  }

  beforeEach(() => {
    mockPrisma = {
      member: {
        findFirst: jest.fn(),
      },
      trainingSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
      gymRoom: {
        findMany: jest.fn().mockResolvedValue([{ roomId: 1n, name: 'Room 1' }]),
      },
      memberWorkoutPlan: {
        findFirst: jest.fn(),
      },
      workoutPlanDay: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    }

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    }

    mockCallerResolver = {
      resolveMemberId: jest.fn().mockResolvedValue(10n),
    }

    mockNotifications = {
      safeNotifyUser: jest.fn().mockResolvedValue(true),
      safeNotifyManyUsers: jest.fn().mockResolvedValue([true]),
    }

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'LINE_MESSAGING_ENABLED') return 'false'
        if (key === 'LINE_MOCK_ENABLED') return 'true'
        if (key === 'LINE_LIFF_URL') return 'https://liff.line.me/MOCK_LIFF_ID'
        if (key === 'LINE_REMINDER_MINUTES') return '30'
        return null
      }),
    }

    lineMessagingService = new LineMessagingService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
      mockNotifications as unknown as NotificationsService
    )

    // Spy on lineMessaging methods
    jest.spyOn(lineMessagingService, 'safePushTrainingSessionEvent').mockResolvedValue(true)

    notificationService = new TrainingSessionNotificationService(
      mockNotifications as unknown as NotificationsService,
      lineMessagingService
    )

    const mockAttendance = {
      isSessionAttendanceValid: jest.fn().mockReturnValue(true),
    }

    presenter = new TrainingSessionPresenter(mockAttendance as any)

    schedulingService = new TrainingSessionSchedulingService(
      mockPrisma as unknown as PrismaService
    )

    availabilityService = new TrainerSessionAvailabilityService(
      mockPrisma as unknown as PrismaService
    )

    bookingService = new MemberSessionBookingService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockCallerResolver as unknown as TrainingCallerResolverService,
      schedulingService,
      presenter,
      notificationService,
      availabilityService
    )
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-01: Instant Booking & BR-10: Notification Flow
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-01 & BR-10: Instant Booking & Multi-channel Notifications', () => {
    it('creates session directly in scheduled status and dispatches in-app + LINE push notifications', async () => {
      const startTime = addDays(2, 9)
      const endTime = addDays(2, 10)

      // 1. Mock Member with Primary Trainer
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        userId: 101n,
        primaryTrainerId: 5n,
        primaryTrainer: {
          staffId: 5n,
          userId: 50n,
          deletedAt: null,
          user: { fullName: 'Coach Alex', avatarFileId: null },
        },
        user: { fullName: 'John Doe', lineId: 'U_LINE_123' },
      })

      // 2. Mock pending session count < 3
      mockPrisma.trainingSession.count.mockResolvedValue(0)

      // 3. Mock Active Subscription on that date
      mockPrisma.subscription.findFirst.mockResolvedValue({
        subscriptionId: 100n,
        memberId: 10n,
        status: 'active',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      })

      // 4. Mock No Overlap for trainer and member
      mockPrisma.trainingSession.findMany.mockResolvedValue([])

      // 5. Mock Available Room
      mockPrisma.gymRoom.findMany.mockResolvedValue([
        { roomId: 1n, name: 'Room 1', capacity: 1, deletedAt: null },
      ])

      // 6. Mock Created Session Record
      const createdSession = {
        sessionId: 999n,
        memberId: 10n,
        trainerStaffId: 5n,
        roomId: 1n,
        assignmentId: null,
        planDayId: null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: TrainingSessionStatus.scheduled,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        member: {
          memberId: 10n,
          userId: 101n,
          user: { fullName: 'John Doe', avatarFileId: null },
        },
        trainer: {
          staffId: 5n,
          userId: 50n,
          user: { fullName: 'Coach Alex', avatarFileId: null },
        },
        room: { roomId: 1n, name: 'Room 1' },
        assignment: null,
        planDay: null,
      }
      mockPrisma.trainingSession.create.mockResolvedValue(createdSession)

      const result = await bookingService.bookSessionByMember(
        { startTime, endTime },
        makeCaller()
      )

      // Assertions for BR-01
      expect(result.data.status).toBe('scheduled')
      expect(result.data.sessionId).toBe('999')
      expect(result.data.trainerName).toBe('Coach Alex')
      expect(result.data.roomName).toBe('Room 1')

      // Audit Log recorded
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'training.member_book',
          resourceType: 'training_session',
          resourceId: '999',
        })
      )

      // Assertions for BR-10: In-App Notification to Member and Trainer
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        101n,
        expect.objectContaining({
          type: 'training.created',
          resourceId: '999',
          metadata: { trainerName: 'Coach Alex' },
        })
      )
      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [50n],
        expect.objectContaining({
          type: 'training.created',
          resourceId: '999',
          metadata: { memberName: 'John Doe' },
        }),
        { excludeActorUserId: 101n }
      )

      // Assertions for BR-10: LINE Push Event triggered
      expect(lineMessagingService.safePushTrainingSessionEvent).toHaveBeenCalledWith(
        'created',
        999n
      )
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-02: Primary Trainer Scope
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-02: Primary Trainer Scope', () => {
    it('throws 400 NO_PRIMARY_TRAINER when member has no assigned primary trainer', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: null,
        primaryTrainer: null,
      })

      const startTime = addDays(1, 10)
      const endTime = addDays(1, 11)

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'NO_PRIMARY_TRAINER',
        }),
      })
    })

    it('throws 400 NO_PRIMARY_TRAINER in trainer-availability query when no PT assigned', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: null,
        primaryTrainer: null,
      })

      await expect(
        bookingService.getTrainerAvailability({ date: '2026-08-20' }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'NO_PRIMARY_TRAINER',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-03 & BR-04: Duration & Booking Window Constraints
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-03 & BR-04: Duration & Booking Window Constraints', () => {
    it('throws 400 INVALID_DURATION if session duration is not exactly 60 minutes (e.g. 30 mins)', async () => {
      const startTime = addDays(1, 10)
      const endTime = new Date(new Date(startTime).getTime() + 30 * 60 * 1000).toISOString()

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVALID_DURATION',
        }),
      })
    })

    it('throws 400 INVALID_BOOKING_TIME if slot starts in less than 5 minutes (or in the past)', async () => {
      const startTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()
      const endTime = new Date(Date.now() + 62 * 60 * 1000).toISOString()

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVALID_BOOKING_TIME',
        }),
      })
    })

    it('throws 400 INVALID_BOOKING_TIME if booking exceeds 7 days into the future', async () => {
      const startTime = addDays(8, 10)
      const endTime = addDays(8, 11)

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVALID_BOOKING_TIME',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-05: Quota 3 Pending Sessions
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-05: Quota Limit (Max 3 Pending Sessions)', () => {
    it('throws 400 BOOKING_LIMIT_EXCEEDED when member already has 3 scheduled future sessions', async () => {
      const startTime = addDays(2, 14)
      const endTime = addDays(2, 15)

      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 5n,
        primaryTrainer: { staffId: 5n, deletedAt: null },
      })

      // Count returns 3 existing scheduled sessions
      mockPrisma.trainingSession.count.mockResolvedValue(3)

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'BOOKING_LIMIT_EXCEEDED',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-06: Active Subscription Requirement
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-06: Active Subscription Requirement', () => {
    it('throws 409 MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION when member has no active subscription on session date', async () => {
      const startTime = addDays(2, 14)
      const endTime = addDays(2, 15)

      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 5n,
        primaryTrainer: { staffId: 5n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(0)

      // No active subscription covering the date
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-07: Room Auto-Allocation & Overlap Conflict Detection
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-07: Room Auto-allocation & Overlap Prevention', () => {
    beforeEach(() => {
      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        primaryTrainerId: 5n,
        primaryTrainer: { staffId: 5n, deletedAt: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.subscription.findFirst.mockResolvedValue({
        subscriptionId: 100n,
        status: 'active',
      })
    })

    it('throws 409 TRAINER_TIME_OVERLAP when trainer is already booked in that slot', async () => {
      const startTime = addDays(2, 14)
      const endTime = addDays(2, 15)

      // Trainer has overlapping session found by findFirst
      mockPrisma.trainingSession.findFirst.mockResolvedValueOnce({
        sessionId: 55n,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        trainer: { user: { fullName: 'Coach Alex' } },
        room: { name: 'Room 1' },
      })

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TRAINER_TIME_OVERLAP',
        }),
      })
    })

    it('throws 409 MEMBER_TIME_OVERLAP when member has another session in that slot', async () => {
      const startTime = addDays(2, 14)
      const endTime = addDays(2, 15)

      // Trainer check passes (null), but member check finds overlap
      mockPrisma.trainingSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          sessionId: 66n,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          member: { user: { fullName: 'John Doe' } },
          room: { name: 'Room 1' },
        })

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'MEMBER_TIME_OVERLAP',
        }),
      })
    })

    it('throws 409 NO_ROOM_AVAILABLE when all rooms are fully occupied', async () => {
      const startTime = addDays(2, 14)
      const endTime = addDays(2, 15)

      // No trainer or member overlap
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)

      // No available rooms returned
      mockPrisma.gymRoom.findMany.mockResolvedValue([])

      await expect(
        bookingService.bookSessionByMember({ startTime, endTime }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'NO_ROOM_AVAILABLE',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-08: Workout Plan Linkage
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-08: Workout Plan Linkage', () => {
    it('links session with active workout plan assignment and plan day', async () => {
      const startTime = addDays(2, 10)
      const endTime = addDays(2, 11)

      mockPrisma.member.findFirst.mockResolvedValue({
        memberId: 10n,
        userId: 101n,
        primaryTrainerId: 5n,
        primaryTrainer: {
          staffId: 5n,
          userId: 50n,
          deletedAt: null,
          user: { fullName: 'Coach Alex', avatarFileId: null },
        },
        user: { fullName: 'John Doe', lineId: null },
      })
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.subscription.findFirst.mockResolvedValue({
        subscriptionId: 100n,
        status: 'active',
      })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.gymRoom.findMany.mockResolvedValue([
        { roomId: 2n, name: 'Room 2', capacity: 1, deletedAt: null },
      ])

      // Mock member active assignment
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({
        assignmentId: 77n,
        planId: 1n,
      })
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue({
        planDayId: 88n,
        planId: 1n,
      })

      const createdSession = {
        sessionId: 1001n,
        memberId: 10n,
        trainerStaffId: 5n,
        roomId: 2n,
        assignmentId: 77n,
        planDayId: 88n,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: TrainingSessionStatus.scheduled,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        member: {
          memberId: 10n,
          userId: 101n,
          user: { fullName: 'John Doe', avatarFileId: null },
        },
        trainer: {
          staffId: 5n,
          userId: 50n,
          user: { fullName: 'Coach Alex', avatarFileId: null },
        },
        room: { roomId: 2n, name: 'Room 2' },
        assignment: {
          assignmentId: 77n,
          planId: 1n,
          plan: { planId: 1n, name: 'Hypertrophy 4-Day', description: null, status: 'active' },
        },
        planDay: {
          planDayId: 88n,
          planId: 1n,
          dayNumber: 1,
          weekNumber: 1,
          dayOfWeek: 1,
          name: 'Chest & Triceps',
          notes: null,
        },
      }
      mockPrisma.trainingSession.create.mockResolvedValue(createdSession)

      const result = await bookingService.bookSessionByMember(
        { startTime, endTime, assignmentId: '77', planDayId: '88' },
        makeCaller()
      )

      expect(result.data.assignmentId).toBe('77')
      expect(result.data.planDayId).toBe('88')
      expect(result.data.workoutPlan?.name).toBe('Hypertrophy 4-Day')
      expect(result.data.planDay?.name).toBe('Chest & Triceps')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // BR-09: Member Cancellation Policy
  // ───────────────────────────────────────────────────────────────────────────
  describe('BR-09: Cancellation Policy (>= 2h Window & Audit)', () => {
    it('cancels scheduled session successfully when cancellation is >= 2 hours before start', async () => {
      const sessionFuture = {
        sessionId: 500n,
        memberId: 10n,
        trainerStaffId: 5n,
        roomId: 1n,
        assignmentId: null,
        planDayId: null,
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours in future (>= 2h)
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        status: TrainingSessionStatus.scheduled,
        deletedAt: null,
        member: {
          memberId: 10n,
          userId: 101n,
          user: { fullName: 'John Doe', avatarFileId: null },
        },
        trainer: {
          staffId: 5n,
          userId: 50n,
          user: { fullName: 'Coach Alex', avatarFileId: null },
        },
        room: { roomId: 1n, name: 'Room 1' },
        assignment: null,
        planDay: null,
      }

      mockPrisma.trainingSession.findFirst.mockResolvedValue(sessionFuture)
      mockPrisma.trainingSession.update.mockResolvedValue({
        ...sessionFuture,
        status: TrainingSessionStatus.cancelled,
      })

      const response = await bookingService.cancelBookingByMember(
        500n,
        { reason: 'Bận lịch công tác đột xuất' },
        makeCaller()
      )

      expect(response.success).toBe(true)
      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 500n },
          data: { status: TrainingSessionStatus.cancelled },
        })
      )

      // Audit Log recorded with reason
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'training.member_cancel',
          resourceType: 'training_session',
          resourceId: '500',
          afterData: expect.objectContaining({
            reason: 'Bận lịch công tác đột xuất',
          }),
        })
      )

      // In-app & LINE notifications sent
      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [101n],
        expect.objectContaining({ type: 'training.cancelled' }),
        { excludeActorUserId: 101n }
      )
      expect(lineMessagingService.safePushTrainingSessionEvent).toHaveBeenCalledWith(
        'cancelled',
        500n
      )
    })

    it('throws 400 LATE_CANCELLATION when cancellation is less than 2 hours before start', async () => {
      const sessionNear = {
        sessionId: 501n,
        memberId: 10n,
        trainerStaffId: 5n,
        startTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours in future (< 2h)
        endTime: new Date(Date.now() + 150 * 60 * 1000),
        status: TrainingSessionStatus.scheduled,
        deletedAt: null,
      }

      mockPrisma.trainingSession.findFirst.mockResolvedValue(sessionNear)

      await expect(
        bookingService.cancelBookingByMember(
          501n,
          { reason: 'Kẹt xe không đến kịp' },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'LATE_CANCELLATION',
        }),
      })
    })

    it('throws 409 SESSION_NOT_CANCELLABLE when session is already cancelled or completed', async () => {
      const sessionCancelled = {
        sessionId: 502n,
        memberId: 10n,
        trainerStaffId: 5n,
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        status: TrainingSessionStatus.cancelled,
        deletedAt: null,
      }

      mockPrisma.trainingSession.findFirst.mockResolvedValue(sessionCancelled)

      await expect(
        bookingService.cancelBookingByMember(
          502n,
          { reason: 'Hủy lại lần nữa' },
          makeCaller()
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'SESSION_NOT_CANCELLABLE',
        }),
      })
    })

    it('throws 403 FORBIDDEN when attempting to cancel another member session', async () => {
      const otherMemberSession = {
        sessionId: 503n,
        memberId: 999n, // Different member
        trainerStaffId: 5n,
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        status: TrainingSessionStatus.scheduled,
        deletedAt: null,
      }

      mockPrisma.trainingSession.findFirst.mockResolvedValue(otherMemberSession)

      await expect(
        bookingService.cancelBookingByMember(
          503n,
          { reason: 'Tò mò bấm hủy' },
          makeCaller({ memberId: 10n })
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Multi-Language Push Templates (vi & ja) & Cron Reminders
  // ───────────────────────────────────────────────────────────────────────────
  describe('LINE Message Templates (vi / ja) & Cron Reminders', () => {
    it('sends 30-minute upcoming reminder and starting reminder with dedupeKey', async () => {
      const now = new Date()
      const in30Mins = new Date(now.getTime() + 30 * 60 * 1000)

      const upcomingSessions = [
        {
          sessionId: 700n,
          memberId: 10n,
          trainerStaffId: 5n,
          startTime: in30Mins,
          endTime: new Date(in30Mins.getTime() + 60 * 60 * 1000),
          status: TrainingSessionStatus.scheduled,
          deletedAt: null,
          member: {
            userId: 101n,
            user: { lineId: 'U_LINE_123', fullName: 'John Doe' },
          },
          trainer: {
            user: { fullName: 'Coach Alex' },
          },
          room: { name: 'Room VIP' },
        },
      ]

      mockPrisma.trainingSession.findMany.mockResolvedValue(upcomingSessions)

      await lineMessagingService.sendUpcomingSessionReminders()

      // In-app notifications sent with distinct dedupeKeys
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        101n,
        expect.objectContaining({
          type: 'training.reminder',
          dedupeKey: 'training:700:reminder:30',
        })
      )
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        101n,
        expect.objectContaining({
          type: 'training.starting',
          dedupeKey: 'training:700:starting',
        })
      )
    })

    it('formats created push notification in Vietnamese with QuickReply button', async () => {
      const originalFetch = global.fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('ok'),
      })
      global.fetch = mockFetch as any

      try {
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'LINE_MESSAGING_ENABLED') return 'true'
          if (key === 'LINE_CHANNEL_ACCESS_TOKEN') return 'ACCESS_TOKEN_123'
          if (key === 'LINE_LIFF_URL') return 'https://liff.line.me/123456-abcdef'
          if (key === 'LINE_MESSAGE_LOCALE') return 'vi'
          return null
        })

        const realLineService = new LineMessagingService(
          mockPrisma as unknown as PrismaService,
          mockConfig as unknown as ConfigService,
          mockNotifications as unknown as NotificationsService
        )

        mockPrisma.trainingSession.findFirst.mockResolvedValue({
          sessionId: 888n,
          memberId: 10n,
          startTime: new Date('2026-08-20T09:00:00.000Z'),
          status: TrainingSessionStatus.scheduled,
          member: {
            userId: 101n,
            user: { lineId: 'U_VIET_USER', fullName: 'Nguyễn Văn A' },
          },
          trainer: {
            user: { fullName: 'Coach Minh' },
          },
          room: { name: 'Phòng VIP 1' },
        })

        const result = await realLineService.safePushTrainingSessionEvent('created', 888n)
        expect(result).toBe(true)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.line.me/v2/bot/message/push',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Bạn đã đặt lịch tập thành công.'),
          })
        )

        const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(payload.to).toBe('U_VIET_USER')
        expect(payload.messages[0].text).toContain('PT: Coach Minh')
        expect(payload.messages[0].text).toContain('Phòng: Phòng VIP 1')
        expect(payload.messages[0].quickReply.items[0].action.label).toBe('Xem chi tiết')
        expect(payload.messages[0].quickReply.items[0].action.uri).toContain(
          'https://liff.line.me/123456-abcdef?liff.state=%3Fredirect%3D%252Fmember%252Fworkout%252Fsessions%253FsessionId%253D888'
        )
      } finally {
        global.fetch = originalFetch
      }
    })

    it('formats created push notification in Japanese with QuickReply button', async () => {
      const originalFetch = global.fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('ok'),
      })
      global.fetch = mockFetch as any

      try {
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'LINE_MESSAGING_ENABLED') return 'true'
          if (key === 'LINE_CHANNEL_ACCESS_TOKEN') return 'ACCESS_TOKEN_123'
          if (key === 'LINE_LIFF_URL') return 'https://liff.line.me/123456-abcdef'
          if (key === 'LINE_MESSAGE_LOCALE') return 'ja'
          return null
        })

        const realLineService = new LineMessagingService(
          mockPrisma as unknown as PrismaService,
          mockConfig as unknown as ConfigService,
          mockNotifications as unknown as NotificationsService
        )

        mockPrisma.trainingSession.findFirst.mockResolvedValue({
          sessionId: 999n,
          memberId: 10n,
          startTime: new Date('2026-08-20T09:00:00.000Z'),
          status: TrainingSessionStatus.scheduled,
          member: {
            userId: 101n,
            user: { lineId: 'U_JAPAN_USER', fullName: 'Tanaka Ken' },
          },
          trainer: {
            user: { fullName: 'Coach Alex' },
          },
          room: { name: 'Room B' },
        })

        const result = await realLineService.safePushTrainingSessionEvent('created', 999n)
        expect(result).toBe(true)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.line.me/v2/bot/message/push',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('トレーニング予約が完了しました。'),
          })
        )

        const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(payload.to).toBe('U_JAPAN_USER')
        expect(payload.messages[0].text).toContain('PT: Coach Alex')
        expect(payload.messages[0].text).toContain('ルーム: Room B')
        expect(payload.messages[0].quickReply.items[0].action.label).toBe('詳細を見る')
        expect(payload.messages[0].quickReply.items[0].action.uri).toContain(
          'https://liff.line.me/123456-abcdef?liff.state=%3Fredirect%3D%252Fmember%252Fworkout%252Fsessions%253FsessionId%253D999'
        )
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})
