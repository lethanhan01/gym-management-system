import { EquipmentStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListEquipmentDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  warrantyExpiring?: boolean = false

  @IsOptional()
  @IsString()
  sort?: string
}