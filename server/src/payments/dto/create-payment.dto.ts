import { Type } from 'class-transformer'
import { IsEnum, IsOptional, IsPositive, IsString } from 'class-validator'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

export class CreatePaymentDto {
  @Type(() => Number) @IsPositive() memberId!: number
  @Type(() => Number) @IsPositive() subscriptionId!: number
  @Type(() => Number) @IsPositive() amount!: number
  @IsEnum(PaymentMethod) method!: PaymentMethod
  @IsOptional() @IsString() transactionReference?: string
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus
}
