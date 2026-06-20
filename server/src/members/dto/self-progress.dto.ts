import { IsNumber, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class SelfProgressDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  weight!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number
}
