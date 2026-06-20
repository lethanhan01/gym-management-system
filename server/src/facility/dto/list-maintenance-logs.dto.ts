import { MaintenanceStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

export class ListMaintenanceLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string
}