import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateMemberBookingDto {
  @IsISO8601()
  @IsNotEmpty()
  startTime!: string

  @IsISO8601()
  @IsNotEmpty()
  endTime!: string

  @IsOptional()
  @IsString()
  assignmentId?: string

  @IsOptional()
  @IsString()
  planDayId?: string
}
