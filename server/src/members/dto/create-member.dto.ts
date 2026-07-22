import { Transform, Type } from 'class-transformer'
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, Length, Matches } from 'class-validator'
import { PaymentMethod } from '@prisma/client'
import { normalizeEmail, normalizeText, normalizeVietnamPhone } from '../../common/normalization'

/** UC03A: staff creates a member account at the counter with subscription and payment. */
export class CreateMemberDto {
  @Transform(({ value }) => normalizeEmail(String(value))) @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @Transform(({ value }) => normalizeText(String(value))) @IsString() @IsNotEmpty() @Length(2, 100) fullName!: string
  @Transform(({ value }) => normalizeVietnamPhone(String(value)) ?? String(value)) @IsString() @IsNotEmpty() @Matches(/^0\d{9}$/) phone!: string
  @IsDateString() dateOfBirth!: string
  @Transform(({ value }) => normalizeText(value === undefined ? undefined : String(value))) @IsOptional() @IsString() @Length(0, 200) address?: string

  @Type(() => Number) @IsPositive() packageId!: number
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod
  @IsOptional() @IsString() transactionReference?: string
}
