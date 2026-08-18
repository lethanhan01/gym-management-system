import {
  BadRequestException,
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
import { ApiBody, ApiOperation, ApiQuery, ApiSecurity } from '@nestjs/swagger'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { DatabaseRetryable } from '../common/decorators/database-retryable.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AttendanceService } from './attendance.service'
import { DeviceAccessService } from './device-access.service'
import { MemberProgressService } from './member-progress.service'
import { MemberSessionBookingService } from './member-session-booking.service'
import { TrainerSessionAvailabilityService } from './trainer-session-availability.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionService } from './training-session.service'
import { DeviceApiKeyGuard } from './guards/device-api-key.guard'
import {
  ListSessionsDto,
  CreateSessionDto,
  UpdateSessionDto,
  UpdateSessionStatusDto,
  CancelSessionDto,
  ListAttendanceLogsDto,
  ManualCheckinDto,
  QrCheckinDto,
  CheckoutDto,
  CreateProgressDto,
  TrainerAvailabilityQueryDto,
  CreateMemberBookingDto,
  CancelBookingDto,
} from './dto'

@Controller()
@UseGuards(PermissionsGuard)
export class TrainingController {
  constructor(
    private readonly sessions: TrainingSessionService,
    private readonly bookings: MemberSessionBookingService,
    private readonly attendance: AttendanceService,
    private readonly progress: MemberProgressService,
    private readonly availability: TrainerSessionAvailabilityService,
    private readonly caller: TrainingCallerResolverService,
  ) {}

  // ---- Training Sessions ----
  @Get('training-sessions')
  @DatabaseRetryable()
  @RequirePermission('session.read')
  async listSessions(@Query() query: ListSessionsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.sessions.listSessions(query, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Get('training-sessions/trainer-availability')
  @DatabaseRetryable()
  @RequirePermission('session.book')
  async getTrainerAvailability(
    @Query() query: TrainerAvailabilityQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.bookings.getTrainerAvailability(query, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Get('training-sessions/trainer-availability-for-trainer')
  @DatabaseRetryable()
  @RequirePermission('session.manage')
  async getTrainerAvailabilityForTrainer(
    @Query() query: TrainerAvailabilityQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const trainerStaffId = query.trainerStaffId
      ? BigInt(query.trainerStaffId)
      : await this.caller.resolveStaffId({
          userId: user.userId,
          roles: user.roles,
          staffId: user.staffId,
          memberId: user.memberId,
        })
    if (!trainerStaffId) {
      throw new BadRequestException({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'trainerStaffId la bat buoc',
      })
    }
    const memberId = query.memberId ? BigInt(query.memberId) : undefined
    const result = await this.availability.getAvailabilitySlots(
      query.date,
      trainerStaffId,
      memberId,
    )
    return { success: true, ...result }
  }

  @Post('training-sessions/book')
  @HttpCode(HttpStatus.CREATED)
  @DatabaseRetryable()
  @RequirePermission('session.book')
  async bookSession(
    @Body() dto: CreateMemberBookingDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.bookings.bookSessionByMember(dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Post('training-sessions/:id/cancel-booking')
  @HttpCode(HttpStatus.OK)
  @DatabaseRetryable()
  @RequirePermission('session.book')
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.bookings.cancelBookingByMember(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return result
  }

  @Get('training-sessions/:id')
  @DatabaseRetryable()
  @RequirePermission('session.read')
  async getSession(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.sessions.getSession(BigInt(id), {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Post('training-sessions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('session.manage')
  async createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.sessions.createSession(dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Patch('training-sessions/:id')
  @RequirePermission('session.manage')
  async updateSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.sessions.updateSession(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Post('training-sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('session.manage')
  async cancelSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelSessionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.sessions.cancelSession(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true }
  }

  @Post('training-sessions/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('session.manage')
  async updateSessionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSessionStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.sessions.updateSessionStatus(BigInt(id), dto.status, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  // ---- Attendance ----

  @Get('attendance-logs')
  @DatabaseRetryable()
  @RequirePermission('attendance.read')
  async listAttendance(
    @Query() query: ListAttendanceLogsDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.attendance.listAttendance(query, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Post('attendance/manual-checkin')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('attendance.checkin')
  async manualCheckin(@Body() dto: ManualCheckinDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.attendance.manualCheckin(dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Get('attendance/qr-token')
  @RequirePermission('attendance.checkin')
  async getQrToken() {
    return { success: true, data: this.attendance.generateQrToken() }
  }

  @Post('attendance/qr-checkin')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('attendance.self-checkin')
  async qrCheckin(@Body() dto: QrCheckinDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.attendance.qrCheckin(dto, {
      userId: user.userId,
      roles: user.roles,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Patch('attendance-logs/:id/checkout')
  @RequirePermission('attendance.checkin')
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.attendance.checkout(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  // ---- Progress ----

  @Get('members/:id/progress')
  @DatabaseRetryable()
  @RequirePermission('progress.read')
  @ApiOperation({ summary: 'Lấy lịch sử chỉ số tiến trình của hội viên' })
  @ApiQuery({ name: 'from', required: false, description: 'Mốc thời gian bắt đầu (ISO 8601).' })
  @ApiQuery({ name: 'to', required: false, description: 'Mốc thời gian kết thúc (ISO 8601).' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi tối đa.' })
  async listProgress(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: { from?: string; to?: string; limit?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.progress.listProgress(BigInt(id), query, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
      memberId: user.memberId,
    })
    return { success: true, ...result }
  }

  @Post('members/:id/progress')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('progress.record')
  async recordProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProgressDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.progress.recordProgress(BigInt(id), dto, {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
    return { success: true, ...result }
  }

  @Delete('member-progress/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('progress.record')
  async deleteProgress(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.progress.deleteProgress(BigInt(id), {
      userId: user.userId,
      roles: user.roles,
      staffId: user.staffId,
    })
  }
}

// Device controller - separate (no JWT auth)
@Controller('devices')
@UseGuards(DeviceApiKeyGuard)
export class DeviceController {
  constructor(private readonly deviceAccess: DeviceAccessService) {}

  @Post('access-events')
  @ApiOperation({ summary: 'Nhận sự kiện ra/vào từ thiết bị kiểm soát' })
  @ApiSecurity('deviceApiKey')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['memberIdentifier', 'occurredAt', 'deviceId'],
      properties: {
        memberIdentifier: { type: 'string', example: 'MEM-000001' },
        occurredAt: { type: 'string', format: 'date-time', example: '2026-07-23T09:30:00.000Z' },
        deviceId: { type: 'string', example: 'gate-01' },
      },
    },
  })
  async accessEvent(
    @Body() body: { memberIdentifier: string; occurredAt: string; deviceId: string }
  ) {
    return this.deviceAccess.deviceAccessEvent(body)
  }
}
