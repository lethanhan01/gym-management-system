import { Module } from '@nestjs/common'
import { PaymentsController, PaymentAccountsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuditService } from '../common/audit/audit.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { LineMessagingModule } from '../line-messaging/line-messaging.module'

@Module({
  imports: [NotificationsModule, LineMessagingModule],
  controllers: [PaymentsController, PaymentAccountsController],
  providers: [PaymentsService, AuditService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
