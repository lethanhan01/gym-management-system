import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { SubscriptionStatus } from '@prisma/client'

export class ListSubscriptionsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) memberId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) packageId?: number
  @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus
  @IsOptional() @IsString() from?: string
  @IsOptional() @IsString() to?: string
  @IsOptional() @IsString() sort?: string
}
