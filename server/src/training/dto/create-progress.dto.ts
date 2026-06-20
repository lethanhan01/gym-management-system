import { IsOptional, IsNumber, Min, Max, IsString, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProgressDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  weight?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(50)
  bmi?: number

  @IsOptional()
  @IsString()
  goal?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsDateString()
  recordedAt?: string
}