import { LineMessagingService } from '../line-messaging/line-messaging.service'
import { NotificationsService } from '../notifications/notifications.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { SessionRow } from './training.types'

describe('TrainingSessionNotificationService', () => {
  let service: TrainingSessionNotificationService
  let mockNotifications: {
    safeNotifyUser: jest.Mock
    safeNotifyManyUsers: jest.Mock
  }
  let mockLineMessaging: {
    safePushTrainingSessionEvent: jest.Mock
    safePushTrainingSessionCompleted: jest.Mock
  }

  const makeSession = (overrides = {}): SessionRow =>
    ({
      sessionId: 100n,
      memberId: 10n,
      trainerStaffId: 20n,
      roomId: 30n,
      startTime: new Date('2026-08-20T08:00:00Z'),
      endTime: new Date('2026-08-20T09:00:00Z'),
      status: 'scheduled',
      member: {
        memberId: 10n,
        userId: 101n,
        user: { fullName: 'Member John' },
      },
      trainer: {
        staffId: 20n,
        userId: 202n,
        user: { fullName: 'Trainer Sarah' },
      },
      room: {
        roomId: 30n,
        name: 'Room A',
      },
      assignment: null,
      planDay: null,
      ...overrides,
    }) as unknown as SessionRow

  beforeEach(() => {
    mockNotifications = {
      safeNotifyUser: jest.fn(),
      safeNotifyManyUsers: jest.fn(),
    }
    mockLineMessaging = {
      safePushTrainingSessionEvent: jest.fn(),
      safePushTrainingSessionCompleted: jest.fn(),
    }

    service = new TrainingSessionNotificationService(
      mockNotifications as unknown as NotificationsService,
      mockLineMessaging as unknown as LineMessagingService
    )
  })

  describe('notifyCreated', () => {
    it('sends notifications to member, pushes LINE event, and notifies trainer', async () => {
      const session = makeSession()
      await service.notifyCreated(session, 101n)

      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        101n,
        expect.objectContaining({
          type: 'training.created',
          resourceId: '100',
        })
      )
      expect(mockLineMessaging.safePushTrainingSessionEvent).toHaveBeenCalledWith('created', 100n)
      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [202n],
        expect.objectContaining({
          type: 'training.created',
          metadata: { memberName: 'Member John' },
        }),
        { excludeActorUserId: 101n }
      )
    })
  })

  describe('notifyUpdated', () => {
    it('does nothing when no relevant fields have changed', async () => {
      const before = makeSession()
      const after = makeSession()

      await service.notifyUpdated(before, after, 101n)

      expect(mockNotifications.safeNotifyManyUsers).not.toHaveBeenCalled()
      expect(mockLineMessaging.safePushTrainingSessionEvent).not.toHaveBeenCalled()
    })

    it('sends update notifications when start time has changed', async () => {
      const before = makeSession()
      const after = makeSession({ startTime: new Date('2026-08-20T09:00:00Z') })

      await service.notifyUpdated(before, after, 202n)

      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [101n],
        expect.objectContaining({ type: 'training.updated' }),
        { excludeActorUserId: 202n }
      )
      expect(mockLineMessaging.safePushTrainingSessionEvent).toHaveBeenCalledWith('updated', 100n)
      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [202n, 202n],
        expect.objectContaining({ type: 'training.updated' }),
        { excludeActorUserId: 202n }
      )
    })
  })

  describe('notifyCancelled', () => {
    it('notifies member and trainer and pushes LINE cancellation event', async () => {
      const session = makeSession()
      await service.notifyCancelled(session, 101n)

      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [101n],
        expect.objectContaining({ type: 'training.cancelled' }),
        { excludeActorUserId: 101n }
      )
      expect(mockLineMessaging.safePushTrainingSessionEvent).toHaveBeenCalledWith('cancelled', 100n)
      expect(mockNotifications.safeNotifyManyUsers).toHaveBeenCalledWith(
        [202n],
        expect.objectContaining({ type: 'training.cancelled' }),
        { excludeActorUserId: 101n }
      )
    })
  })

  describe('notifyCompleted', () => {
    it('notifies member about session completion and pushes LINE completed card', async () => {
      const session = makeSession()
      await service.notifyCompleted(session)

      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        101n,
        expect.objectContaining({
          type: 'training.completed',
          resourceId: '100',
        })
      )
      expect(mockLineMessaging.safePushTrainingSessionCompleted).toHaveBeenCalledWith(100n)
    })
  })
})
