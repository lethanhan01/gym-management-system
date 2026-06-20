import { IsInt, IsOptional, IsPositive } from 'class-validator'
import { Type } from 'class-transformer'

export class AssignTrainerDto {
  /** trainerId = null để xóa PT, số nguyên dương để gán PT mới */
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() trainerId?: number | null
}
