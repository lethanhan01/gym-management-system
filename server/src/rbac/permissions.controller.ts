import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { RbacService } from './rbac.service'

@Controller('permissions')
@UseGuards(PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermission('rbac.manage')
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('resource') resource?: string,
  ) {
    const result = await this.rbac.listPermissions(Number(page), Number(pageSize), resource)
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermission('rbac.manage')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.rbac.getPermission(BigInt(id))
    return { success: true, ...result }
  }
}
