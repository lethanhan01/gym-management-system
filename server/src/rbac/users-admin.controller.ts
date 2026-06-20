import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { PrismaService } from '../prisma/prisma.service'
import { RbacService } from './rbac.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { AssignGroupDto } from './dto/assign-group.dto'
import { ListUsersDto } from './dto/list-users.dto'

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersAdminController {
  constructor(
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermission('user.read')
  async list(@Query() q: ListUsersDto) {
    const result = await this.rbac.listUsers(q)
    return { success: true, ...result }
  }

  /** Self bypass: nếu id khớp JWT.sub thì không cần user.read */
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const targetId = BigInt(id)
    if (user.userId !== targetId) await this.assertPermission(user.userId, 'user.read')
    const result = await this.rbac.getUser(targetId)
    return { success: true, ...result }
  }

  @Get(':id/groups')
  async userGroups(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const targetId = BigInt(id)
    if (user.userId !== targetId) await this.assertPermission(user.userId, 'user.read')
    const result = await this.rbac.getUserGroups(targetId)
    return { success: true, ...result }
  }

  @Post(':id/groups')
  @RequirePermission('rbac.manage')
  async assignGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.rbac.assignUserGroup(BigInt(id), BigInt(dto.groupId), user.userId)
    return { success: true, ...result }
  }

  @Delete(':id/groups/:groupId')
  @RequirePermission('rbac.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.rbac.revokeUserGroup(BigInt(id), BigInt(groupId), user.userId)
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const targetId = BigInt(id)
    const isSelf = user.userId === targetId
    if (!isSelf) await this.assertPermission(user.userId, 'user.update')
    const result = await this.rbac.updateUser(targetId, dto, user.userId, isSelf)
    return { success: true, ...result }
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.rbac.deleteUser(BigInt(id), user.userId)
  }

  /** Kiểm tra inline permission (Self-bypass endpoints). */
  private async assertPermission(userId: bigint, code: string) {
    const rows = await this.prisma.userGroup.findMany({
      where: { userId },
      include: { group: { include: { permissions: { include: { permission: true } } } } },
    })
    const has = rows.some((ug) => ug.group.permissions.some((gp) => gp.permission.code === code))
    if (!has) throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: `Cần quyền: ${code}` })
  }
}
