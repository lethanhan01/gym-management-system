import { IsOptional, IsString, IsDateString } from 'class-validator'

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  trainerStaffId?: string

  @IsOptional()
  @IsString()
  roomId?: string

  @IsOptional()
  @IsDateString()
  startTime?: string

  @IsOptional()
  @IsDateString()
  endTime?: string
}