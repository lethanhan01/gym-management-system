import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { UserStatus } from '@prisma/client'

export enum SubscriptionStatusFilter {
  Active = 'active',
  Expired = 'expired',
}

export class ListMembersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20
  @IsOptional() @IsString() search?: string
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus
  @IsOptional()
  @IsEnum(SubscriptionStatusFilter, {
    message: `subStatus phải là: ${Object.values(SubscriptionStatusFilter).join(', ')}`,
  })
  subStatus?: SubscriptionStatusFilter
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trainerId?: number
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeDeleted?: boolean
  @IsOptional() @IsString() sort?: string
}
