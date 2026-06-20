import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { FeedbackService } from './feedback.service'
import { ListFeedbackDto, CreateFeedbackDto, AssignFeedbackDto, UpdateFeedbackStatusDto } from './dto'

@Controller('feedback')
@UseGuards(PermissionsGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  @RequirePermission('feedback.read')
  async list(@Query() dto: ListFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.feedback.list(dto, {
      userId: user.userId,
      roles: user.roles,
      memberId: user.memberId,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermission('feedback.read')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.feedback.get(BigInt(id), {
      userId: user.userId,
      roles: user.roles,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('feedback.create')
  async create(@Body() dto: CreateFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.feedback.create(dto, {
      userId: user.userId,
      roles: user.roles,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Patch(':id/assign')
  @RequirePermission('feedback.handle')
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.feedback.assign(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Patch(':id/status')
  @RequirePermission('feedback.handle')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedbackStatusDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.feedback.updateStatus(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission('feedback.create')
  async softDelete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.feedback.softDelete(BigInt(id), {
      userId: user.userId,
      roles: user.roles,
      memberId: user.memberId,
    })
    return { success: true }
  }
}
