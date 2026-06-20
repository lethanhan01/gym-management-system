import { IsEmail } from 'class-validator'

export class ResendVerifyDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string
}
