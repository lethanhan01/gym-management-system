import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

class LogSetDto {
  @Type(() => Number)
  @IsInt()
  planExerciseId: number

  @Type(() => Number)
  @IsInt()
  setNumber: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actualReps?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  actualWeightKg?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actualDurationSec?: number

  @IsOptional()
  @IsBoolean()
  completed?: boolean
}

export class CreateWorkoutLogDto {
  @Type(() => Number)
  @IsInt()
  assignmentId: number

  @Type(() => Number)
  @IsInt()
  planDayId: number

  @IsDateString()
  loggedAt: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationMin?: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogSetDto)
  sets: LogSetDto[]
}
