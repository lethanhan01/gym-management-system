import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { RbacService } from './rbac.service'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { AssignPermissionsDto } from './dto/assign-permissions.dto'

@Controller('groups')
@UseGuards(PermissionsGuard)
@RequirePermission('rbac.manage')
export class GroupsController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const result = await this.rbac.listGroups(Number(page), Number(pageSize), search, includeDeleted === 'true')
    return { success: true, ...result }
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.rbac.getGroup(BigInt(id))
    return { success: true, ...result }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.rbac.createGroup(dto, user.userId)
    return { success: true, ...result }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.rbac.updateGroup(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.rbac.deleteGroup(BigInt(id), user.userId)
  }

  @Post(':id/permissions')
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.rbac.assignPermissions(BigInt(id), dto.permissions, user.userId)
    return { success: true, ...result }
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.rbac.revokePermission(BigInt(id), BigInt(permissionId), user.userId)
  }
}
