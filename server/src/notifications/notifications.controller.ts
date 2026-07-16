import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { ListNotificationsDto } from './dto/list-notifications.dto'
import { NewNotificationsDto } from './dto/new-notifications.dto'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
@UseGuards(PermissionsGuard)
@RequirePermission('notification.read')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@Query() query: ListNotificationsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.notifications.list(user.userId, query)
    return { success: true, ...result }
  }

  @Get('new')
  async listNew(@Query() query: NewNotificationsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.notifications.listNew(user.userId, BigInt(query.afterId), query.limit)
    return { success: true, ...result }
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notifications.unreadCount(user.userId)
    return { success: true, ...result }
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.notifications.markRead(user.userId, BigInt(id))
    return { success: true, ...result }
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notifications.markAllRead(user.userId)
    return { success: true, ...result }
  }
}
