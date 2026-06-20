import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator'

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  memberId!: string

  @IsOptional()
  @IsString()
  trainerStaffId?: string

  @IsString()
  @IsNotEmpty()
  roomId!: string

  @IsOptional()
  @IsString()
  assignmentId?: string

  @IsOptional()
  @IsString()
  planDayId?: string

  @IsDateString()
  startTime!: string

  @IsDateString()
  endTime!: string
}
