import { IsOptional, IsInt, Min, Max, IsDateString, IsEnum, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { TrainingSessionStatus } from '@prisma/client'

export class ListSessionsDto {
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
  @IsString()
  memberId?: string

  @IsOptional()
  @IsString()
  trainerStaffId?: string

  @IsOptional()
  @IsString()
  roomId?: string

  @IsOptional()
  @IsEnum(TrainingSessionStatus)
  status?: TrainingSessionStatus

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsString()
  sort?: string = 'start_time:asc'
}