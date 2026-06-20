import { MaintenanceStatus } from '@prisma/client'
import { IsIn } from 'class-validator'

export class UpdateMaintenanceLogDto {
  @IsIn([MaintenanceStatus.repairing, MaintenanceStatus.resolved, MaintenanceStatus.failed])
  status!: 'repairing' | 'resolved' | 'failed'
}