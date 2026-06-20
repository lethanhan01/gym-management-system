import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator'

export class UpdateFeedbackStatusDto {
  @IsEnum(['in_progress', 'resolved', 'rejected'])
  status!: string

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  severity?: string

  @ValidateIf((o) => ['resolved', 'rejected'].includes(o.status as string))
  @IsString()
  resolutionNote?: string
}