import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ExerciseCategory } from '@prisma/client'

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory

  @IsOptional()
  @IsString()
  @MaxLength(100)
  muscleGroup?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  equipmentNeeded?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string
}
