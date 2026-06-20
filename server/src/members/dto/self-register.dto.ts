import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsPositive, IsString, Length } from 'class-validator'
import { Type } from 'class-transformer'

/** UC03B: public online self-registration. */
export class SelfRegisterDto {
  @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @IsString() @IsNotEmpty() @Length(2, 100) fullName!: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsDateString() dateOfBirth?: string
  @IsOptional() @IsString() @Length(0, 200) address?: string

  @IsOptional() @Type(() => Number) @IsPositive() packageId?: number
}
