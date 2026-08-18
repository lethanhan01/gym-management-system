import { Module } from '@nestjs/common'
import { TrainingController, DeviceController } from './training.controller'
import { AttendanceService } from './attendance.service'
import { DeviceAccessService } from './device-access.service'
import { MemberProgressService } from './member-progress.service'
import { MemberSessionBookingService } from './member-session-booking.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainerSessionAvailabilityService } from './trainer-session-availability.service'
import { TrainingSessionService } from './training-session.service'
import { DeviceApiKeyGuard } from './guards/device-api-key.guard'
import { AuditService } from '../common/audit/audit.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { LineMessagingModule } from '../line-messaging/line-messaging.module'

@Module({
  imports: [NotificationsModule, LineMessagingModule],
  controllers: [TrainingController, DeviceController],
  providers: [
    AttendanceService,
    DeviceAccessService,
    MemberProgressService,
    MemberSessionBookingService,
    TrainingCallerResolverService,
    TrainingSessionNotificationService,
    TrainingSessionPresenter,
    TrainingSessionSchedulingService,
    TrainerSessionAvailabilityService,
    TrainingSessionService,
    DeviceApiKeyGuard,
    AuditService,
  ],
  exports: [AttendanceService, DeviceAccessService],
})
export class TrainingModule {}
