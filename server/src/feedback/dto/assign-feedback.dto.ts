import { IsOptional, IsString } from 'class-validator'

export class AssignFeedbackDto {
  @IsOptional()
  @IsString()
  handledByStaffId?: string
}