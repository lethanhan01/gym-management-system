import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateFeedbackDto {
  @IsOptional()
  @IsString()
  memberId?: string

  @IsEnum(['staff', 'facility', 'equipment', 'service'])
  feedbackType!: string

  @IsString()
  @IsNotEmpty()
  content!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[]

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  severity?: string

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
}
