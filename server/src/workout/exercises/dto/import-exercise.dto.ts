import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ExerciseCategory } from '@prisma/client'

export class ImportExerciseDto {
  @IsString()
  name: string

  @IsEnum(ExerciseCategory)
  category: ExerciseCategory

  @IsOptional()
  @IsString()
  muscleGroup?: string

  @IsOptional()
  @IsString()
  equipmentNeeded?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string
}
