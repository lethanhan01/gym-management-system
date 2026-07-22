import { IsEmail, IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyEmailDto {
  @ApiProperty({ example: 'owner@gym.local' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string

  @ApiProperty({ writeOnly: true, example: '123456', description: 'OTP gồm 6 ký tự.' })
  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 ký tự số' })
  otp!: string
}
