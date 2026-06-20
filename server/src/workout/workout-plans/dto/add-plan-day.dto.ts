import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class AddPlanDayDto {
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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber: number

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  notes?: string
}
