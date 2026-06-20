import { IsInt, IsOptional, IsPositive } from 'class-validator'
import { Type } from 'class-transformer'

/** UC04A — Gia hạn gói tập cho hội viên */
export class CreateSubscriptionDto {
  @Type(() => Number) @IsPositive() memberId!: number
  @Type(() => Number) @IsPositive() packageId!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  trainerId?: number
}
