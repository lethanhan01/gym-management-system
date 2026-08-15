import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { normalizeEmail, normalizeText, normalizeVietnamPhone } from '../../common/normalization'

/** UC03B: public online self-registration. */
export class SelfRegisterDto {
  @Transform(({ value }) => normalizeEmail(String(value))) @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @Transform(({ value }) => normalizeText(String(value)))
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  fullName!: string
  @Transform(({ value }) => normalizeVietnamPhone(String(value)) ?? String(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^0\d{9}$/)
  phone!: string
  @IsDateString() @IsNotEmpty() dateOfBirth!: string
  @Transform(({ value }) => normalizeText(value === undefined ? undefined : String(value)))
  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string

  @IsOptional() @Type(() => Number) @IsPositive() packageId?: number
}
