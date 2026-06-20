import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min, Max, IsDateString, IsEnum, IsString } from 'class-validator'

export class ListAttendanceLogsDto {
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
  subscriptionId?: string

  @IsOptional()
  @IsString()
  sessionId?: string

  @IsOptional()
  @IsEnum(['realtime', 'manual', 'qr'])
  method?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string
}