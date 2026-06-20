import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator'

export class AssignPlanDto {
  @Type(() => Number)
  @IsInt()
  planId: number

  @IsDateString()
  startDate: string

  @IsOptional()
  @IsString()
  notes?: string
}
