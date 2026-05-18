import { IsEmail } from 'class-validator'

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string
}
