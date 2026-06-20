import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PackagesController } from './packages/packages.controller'
import { PackagesService } from './packages/packages.service'
import { SubscriptionsController } from './subscriptions/subscriptions.controller'
import { SubscriptionsService } from './subscriptions/subscriptions.service'
import { SubscriptionScheduleService } from './schedule/subscription-schedule.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PackagesController, SubscriptionsController],
  providers: [
    PackagesService,
    SubscriptionsService,
    SubscriptionScheduleService,
    AuditService,
  ],
  exports: [PackagesService, SubscriptionsService],
})
export class MembershipModule {}
