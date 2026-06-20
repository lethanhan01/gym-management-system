import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator'

export class CreateFeedbackDto {
  @IsOptional()
  @IsString()
  memberId?: string

  @IsEnum(['staff', 'equipment', 'service'])
  feedbackType!: string

  @IsString()
  @IsNotEmpty()
  content!: string

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  severity?: string

  @IsOptional()
  @IsString()
  subjectStaffId?: string

  @IsOptional()
  @IsString()
  subjectEquipmentId?: string
}