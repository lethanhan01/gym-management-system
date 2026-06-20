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
  UseGuards,
  Query,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { StaffService, ListStaffQuery } from './staff.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { GetStaffAttendanceDto } from './dto/staff-attendance.dto'

@Controller('staff')
@UseGuards(PermissionsGuard)
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    if (!user.staffId) {
      throw new BadRequestException({
        success: false,
        code: 'STAFF_PROFILE_MISSING',
        message: 'Tai khoan khong co staff profile',
      })
    }
    const data = await this.svc.get(user.staffId)
    return { success: true, data }
  }

  @Get()
  @RequirePermission('staff.read')
  async list(@Query() q: ListStaffQuery, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.list(q, user)
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.create')
  async create(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.create(dto, user.userId)
    return { success: true, data }
  }

  @Get('trainers')
  async listTrainers() {
    const data = await this.svc.listTrainers()
    return { success: true, data }
  }

  @Get('schedules/range')
  @RequirePermission('schedule.read')
  async listAllSchedules(@Query('from') from: string, @Query('to') to: string) {
    const data = await this.svc.listAllSchedules(from, to)
    return { success: true, data }
  }

  // attendance (self-service — no extra permission, staffId from JWT)
  @Post('me/attendance/check-in')
  @HttpCode(HttpStatus.CREATED)
  async attendanceCheckIn(@CurrentUser() user: AuthenticatedUser) {
    if (!user.staffId) {
      throw new BadRequestException({
        success: false,
        code: 'STAFF_PROFILE_MISSING',
        message: 'Tai khoan khong co staff profile',
      })
    }
    const data = await this.svc.attendanceCheckIn(user.staffId)
    return { success: true, data }
  }

  @Post('me/attendance/check-out')
  async attendanceCheckOut(@CurrentUser() user: AuthenticatedUser) {
    if (!user.staffId) {
      throw new BadRequestException({
        success: false,
        code: 'STAFF_PROFILE_MISSING',
        message: 'Tai khoan khong co staff profile',
      })
    }
    const data = await this.svc.attendanceCheckOut(user.staffId)
    return { success: true, data }
  }

  @Get('me/attendance')
  async getMyAttendance(@CurrentUser() user: AuthenticatedUser, @Query() q: GetStaffAttendanceDto) {
    if (!user.staffId) {
      throw new BadRequestException({
        success: false,
        code: 'STAFF_PROFILE_MISSING',
        message: 'Tai khoan khong co staff profile',
      })
    }
    const data = await this.svc.getMyAttendance(user.staffId, q)
    return { success: true, data }
  }

  @Get(':id')
  @RequirePermission('staff.read')
  async get(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.get(BigInt(id))
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('staff.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.svc.update(BigInt(id), dto, user.userId)
    return { success: true, data }
  }

  @Delete(':id')
  @RequirePermission('staff.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.delete(BigInt(id), user.userId)
    return { success: true, data }
  }

  // schedules
  @Get(':id/schedules')
  @RequirePermission('schedule.read')
  async listSchedules(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.listSchedules(BigInt(id))
    return { success: true, data }
  }

  @Post(':id/schedules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('schedule.manage')
  async createSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.svc.createSchedule(BigInt(id), dto, user.userId)
    return { success: true, data }
  }

  @Delete(':id/schedules/:scheduleId')
  @RequirePermission('schedule.manage')
  async deleteSchedule(
    @Param('id', ParseIntPipe) _id: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.svc.deleteSchedule(BigInt(_id), BigInt(scheduleId), user.userId)
    return { success: true, data }
  }
}
