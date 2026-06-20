import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString } from 'class-validator'

export class UpdateWorkoutLogDto {
  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationMin?: number
}
