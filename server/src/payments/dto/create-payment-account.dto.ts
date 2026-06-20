import { IsEnum, IsOptional, IsString, Length } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

export class CreatePaymentAccountDto {
  @IsEnum(PaymentMethod) type!: PaymentMethod
  @IsOptional() @IsString() @Length(0, 100) provider?: string
  @IsOptional() @IsString() @Length(0, 100) accountRef?: string
  @IsOptional() @IsString() @Length(0, 100) label?: string
  @IsOptional() isDefault?: boolean
}
