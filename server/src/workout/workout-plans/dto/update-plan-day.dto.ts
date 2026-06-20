import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdatePlanDayDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekNumber?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  notes?: string
}
