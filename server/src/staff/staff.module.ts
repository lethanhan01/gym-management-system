import { Module } from '@nestjs/common'
import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'
import { StaffScheduleService } from './staff-schedule.service'
import { StaffAttendanceService } from './staff-attendance.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [StaffController],
  providers: [StaffService, StaffScheduleService, StaffAttendanceService, AuditService],
  exports: [StaffService, StaffScheduleService, StaffAttendanceService],
})
export class StaffModule {}
