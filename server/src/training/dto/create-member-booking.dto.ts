import { IsISO8601, IsNotEmpty, IsString } from 'class-validator'

export class CreateMemberBookingDto {
  @IsISO8601()
  @IsNotEmpty()
  startTime!: string

  @IsISO8601()
  @IsNotEmpty()
  endTime!: string

  @IsNotEmpty({ message: 'assignmentId khong duoc de trong' })
  @IsString()
  assignmentId!: string

  @IsNotEmpty({ message: 'planDayId khong duoc de trong' })
  @IsString()
  planDayId!: string
}

