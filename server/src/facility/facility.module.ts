import { Module } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { EquipmentService } from './equipment.service'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'
import { MaintenanceService } from './maintenance.service'

@Module({
  controllers: [FacilityController],
  providers: [FacilityService, EquipmentService, MaintenanceService, AuditService],
  exports: [FacilityService, EquipmentService, MaintenanceService],
})
export class FacilityModule {}