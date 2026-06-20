import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

export class ListPaymentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) memberId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) subscriptionId?: number
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod
  @IsOptional() @IsString() from?: string
  @IsOptional() @IsString() to?: string
  @IsOptional() @IsString() dateFrom?: string
  @IsOptional() @IsString() dateTo?: string
  @IsOptional() @IsString() sort?: string
}
