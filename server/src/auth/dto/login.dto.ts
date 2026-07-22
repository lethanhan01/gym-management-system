import { IsEmail, IsString, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'
import { normalizeEmail } from '../../common/normalization'

export class LoginDto {
  @Transform(({ value }) => normalizeEmail(String(value))) @IsEmail({}, { message: 'Email khong hop le' })
  email!: string

  @IsString()
  @MinLength(8, { message: 'Mat khau phai co toi thieu 8 ky tu' })
  password!: string
}
