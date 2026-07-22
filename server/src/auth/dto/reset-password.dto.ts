import { IsEmail, IsString, Length, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
  @ApiProperty({ example: 'owner@gym.local' })
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string

  @ApiProperty({ writeOnly: true, example: '123456', description: 'OTP gồm 6 ký tự.' })
  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 ký tự số' })
  otp!: string

  @ApiProperty({ format: 'password', writeOnly: true, example: 'NewPass456!' })
  @IsString()
  @MinLength(8, { message: 'Mat khau moi phai co toi thieu 8 ky tu' })
  newPassword!: string
}
