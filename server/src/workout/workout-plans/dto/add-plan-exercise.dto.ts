import { Type } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class AddPlanExerciseDto {
  @Type(() => Number)
  @IsInt()
  exerciseId: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetSets: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetReps?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetDurationSec?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetWeightKg?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  restSeconds?: number

  @IsOptional()
  @IsString()
  notes?: string
}
