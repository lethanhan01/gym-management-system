import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { WorkoutPlanStatus } from '@prisma/client'

export class UpdateWorkoutPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(WorkoutPlanStatus)
  status?: WorkoutPlanStatus
}
