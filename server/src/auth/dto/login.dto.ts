import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string

  @IsString()
  @MinLength(8, { message: 'Mat khau phai co toi thieu 8 ky tu' })
  password!: string
}
