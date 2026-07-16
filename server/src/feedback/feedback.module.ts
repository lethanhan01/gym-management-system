import { Module } from '@nestjs/common'
import { FeedbackController } from './feedback.controller'
import { FeedbackService } from './feedback.service'
import { AuditService } from '../common/audit/audit.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, AuditService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
