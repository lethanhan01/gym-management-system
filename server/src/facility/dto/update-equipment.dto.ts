import { EquipmentStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class UpdateEquipmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsDateString()
  importDate?: string

  @IsOptional()
  @IsDateString()
  warrantyUntil?: string

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus
}