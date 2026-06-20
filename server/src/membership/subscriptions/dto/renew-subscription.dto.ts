import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

export class RenewSubscriptionDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  @IsOptional()
  @IsString()
  transactionReference?: string
}
