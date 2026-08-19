import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator'

export class ImportExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsInt()
  @IsPositive()
  bodyPartId?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  targetMuscleId?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  equipmentId?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  gifUrl?: string
}
