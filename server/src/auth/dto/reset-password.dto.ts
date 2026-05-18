import { IsEmail, IsString, Length, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string

  @IsString()
  @Length(6, 10, { message: 'OTP phai co do dai 6-10 ky tu' })
  otp!: string

  @IsString()
  @MinLength(8, { message: 'Mat khau moi phai co toi thieu 8 ky tu' })
  newPassword!: string
}
