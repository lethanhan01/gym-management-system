import { Module } from '@nestjs/common'
import { MembersController } from './members.controller'
import { MemberProgressService } from './member-progress.service'
import { MembersService } from './members.service'
import { TrainerAssignmentService } from './trainer-assignment.service'
import { AuditService } from '../common/audit/audit.service'
import { AuthModule } from '../auth/auth.module'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [MembersController],
  providers: [MembersService, TrainerAssignmentService, MemberProgressService, AuditService],
  exports: [MembersService, TrainerAssignmentService, MemberProgressService],
})
export class MembersModule {}

