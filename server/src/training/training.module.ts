import { Module } from '@nestjs/common'
import { TrainingController, DeviceController } from './training.controller'
import { TrainingService } from './training.service'
import { AttendanceService } from './attendance.service'
import { DeviceAccessService } from './device-access.service'
import { DeviceApiKeyGuard } from './guards/device-api-key.guard'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [TrainingController, DeviceController],
  providers: [TrainingService, AttendanceService, DeviceAccessService, DeviceApiKeyGuard, AuditService],
  exports: [TrainingService, AttendanceService, DeviceAccessService],
})
export class TrainingModule {}
