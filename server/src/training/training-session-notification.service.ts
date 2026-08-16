import { Injectable } from '@nestjs/common'
import { NotificationsService } from '../notifications/notifications.service'
import { LineMessagingService } from '../line-messaging/line-messaging.service'
import { SessionRow } from './training.types'
@Injectable()
export class TrainingSessionNotificationService {
  constructor(private readonly notifications: NotificationsService, private readonly lineMessaging: LineMessagingService) {}
  async notifyCreated(session: SessionRow, actorUserId: bigint) {
    const payload = {
      type: 'training.created',
      title: 'Lich tap moi',
      message: `Ban co lich tap voi PT ${session.trainer.user.fullName}.`,
      resourceType: 'training_session',
      resourceId: session.sessionId.toString(),
      metadata: { trainerName: session.trainer.user.fullName },
      dedupeKey: `training:${session.sessionId.toString()}:created`,
    }
    await this.notifications.safeNotifyUser(session.member.userId, payload)
    await this.lineMessaging.safePushTrainingSessionEvent('created', session.sessionId)
    await this.notifications.safeNotifyManyUsers(
      [session.trainer.userId],
      {
        ...payload,
        message: `Ban co lich tap moi voi hoi vien ${session.member.user.fullName}.`,
        metadata: { memberName: session.member.user.fullName },
      },
      { excludeActorUserId: actorUserId }
    )
  }

  async notifyUpdated(before: SessionRow, after: SessionRow, actorUserId: bigint) {
    const changed =
      before.startTime.getTime() !== after.startTime.getTime() ||
      before.endTime?.getTime() !== after.endTime?.getTime() ||
      before.roomId !== after.roomId ||
      before.trainerStaffId !== after.trainerStaffId
    if (!changed) return

    const memberPayload = {
      type: 'training.updated',
      title: 'Lich tap da cap nhat',
      message: `Lich tap voi PT ${after.trainer.user.fullName} da duoc cap nhat.`,
      resourceType: 'training_session',
      resourceId: after.sessionId.toString(),
      metadata: { trainerName: after.trainer.user.fullName },
      dedupeKey: `training:${after.sessionId.toString()}:updated:${Date.now()}`,
    }
    await this.notifications.safeNotifyManyUsers([after.member.userId], memberPayload, {
      excludeActorUserId: actorUserId,
    })
    await this.lineMessaging.safePushTrainingSessionEvent('updated', after.sessionId)
    await this.notifications.safeNotifyManyUsers(
      [before.trainer.userId, after.trainer.userId],
      {
        ...memberPayload,
        message: `Lich tap voi hoi vien ${after.member.user.fullName} da duoc cap nhat.`,
        metadata: { memberName: after.member.user.fullName },
      },
      { excludeActorUserId: actorUserId }
    )
  }

  async notifyCancelled(session: SessionRow, actorUserId: bigint) {
    const memberPayload = {
      type: 'training.cancelled',
      title: 'Lich tap da huy',
      message: `Lich tap voi PT ${session.trainer.user.fullName} da duoc huy.`,
      resourceType: 'training_session',
      resourceId: session.sessionId.toString(),
      metadata: { trainerName: session.trainer.user.fullName },
      dedupeKey: `training:${session.sessionId.toString()}:cancelled`,
    }
    await this.notifications.safeNotifyManyUsers([session.member.userId], memberPayload, {
      excludeActorUserId: actorUserId,
    })
    await this.lineMessaging.safePushTrainingSessionEvent('cancelled', session.sessionId)
    await this.notifications.safeNotifyManyUsers(
      [session.trainer.userId],
      {
        ...memberPayload,
        message: `Lich tap voi hoi vien ${session.member.user.fullName} da duoc huy.`,
        metadata: { memberName: session.member.user.fullName },
      },
      { excludeActorUserId: actorUserId }
    )
  }
  async notifyCompleted(session: SessionRow) { await this.notifications.safeNotifyUser(session.member.userId, { type: 'training.completed', title: 'Buoi tap da hoan thanh', message: `Buoi tap voi PT ${session.trainer.user.fullName} da duoc danh dau hoan thanh.`, resourceType: 'training_session', resourceId: session.sessionId.toString(), metadata: { trainerName: session.trainer.user.fullName }, dedupeKey: `training:${session.sessionId.toString()}:completed` }) }
}
