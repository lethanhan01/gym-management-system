import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, Length } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

/** UC03A: staff creates a member account at the counter with subscription and payment. */
export class CreateMemberDto {
  @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @IsString() @IsNotEmpty() @Length(2, 100) fullName!: string
  @IsOptional() @IsString() phone?: string
  @IsDateString() dateOfBirth!: string
  @IsOptional() @IsString() @Length(0, 200) address?: string

  @Type(() => Number) @IsPositive() packageId!: number
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod
  @IsOptional() @IsString() transactionReference?: string
}
