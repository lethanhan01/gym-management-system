import { Module } from '@nestjs/common'
import { FeedbackController } from './feedback.controller'
import { FeedbackService } from './feedback.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, AuditService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
