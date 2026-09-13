import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min, Max, IsEnum, IsString, IsBoolean } from 'class-validator'

export class ListFeedbackDto {
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
  @IsEnum(['staff', 'facility', 'equipment', 'service'])
  feedbackType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  severity?: string

  @IsOptional()
  @IsEnum(['open', 'in_progress', 'resolved', 'rejected'])
  status?: string

  @IsOptional()
  @IsString()
  handledByStaffId?: string

  @IsOptional()
  @IsString()
  subjectStaffId?: string

  @IsOptional()
  @IsString()
  subjectEquipmentId?: string

  @IsOptional()
  @IsString()
  subjectRoomId?: string

  @IsOptional()
  @IsString()
  sessionId?: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdue?: boolean = false

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @IsString()
  sort?: string = 'created_at:desc'
}
