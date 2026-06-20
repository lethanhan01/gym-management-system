import {
  Body,
  Controller,
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
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'
import { ListSubscriptionsDto } from './dto/list-subscriptions.dto'
import { RenewSubscriptionDto } from './dto/renew-subscription.dto'
import { SubscriptionsService } from './subscriptions.service'

@Controller('subscriptions')
@UseGuards(PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subscription.create')
  async create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptions.createSubscription(dto, user)
    return { success: true, ...result }
  }

  @Get()
  @RequirePermission('subscription.read')
  async list(@Query() query: ListSubscriptionsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptions.listSubscriptions(query, user)
    return { success: true, ...result }
  }

  @Get('member/:memberId')
  @RequirePermission('subscription.read')
  async listByMember(
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.subscriptions.listByMember(BigInt(memberId), user)
    return { success: true, ...result }
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('subscription.cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() _body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.subscriptions.cancelSubscription(BigInt(id), user)
    return { success: true, ...result }
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('subscription.create')
  async renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.subscriptions.renewSubscription(BigInt(id), dto, user)
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermission('subscription.read')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptions.getSubscription(BigInt(id), user)
    return { success: true, ...result }
  }
}
