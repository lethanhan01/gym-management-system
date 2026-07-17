import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { PrismaModule } from '../prisma/prisma.module'
import { LineMessagingController } from './line-messaging.controller'
import { LineMessagingService } from './line-messaging.service'

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LineMessagingController],
  providers: [LineMessagingService],
  exports: [LineMessagingService],
})
export class LineMessagingModule {}
