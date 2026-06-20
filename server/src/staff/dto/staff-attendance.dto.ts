import { IsDateString, IsOptional } from 'class-validator'

export class GetStaffAttendanceDto {
  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  pageSize?: number
}
