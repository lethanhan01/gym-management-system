import { Module } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { RbacService } from './rbac.service'
import { PermissionsController } from './permissions.controller'
import { GroupsController } from './groups.controller'
import { UsersAdminController } from './users-admin.controller'

@Module({
  controllers: [PermissionsController, GroupsController, UsersAdminController],
  providers: [RbacService, AuditService],
  exports: [RbacService],
})
export class RbacModule {}
