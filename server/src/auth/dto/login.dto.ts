import { IsEmail, IsString, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { normalizeEmail } from '../../common/normalization'

export class LoginDto {
  @ApiProperty({ example: 'owner@gym.local' })
  @Transform(({ value }) => normalizeEmail(String(value))) @IsEmail({}, { message: 'Email khong hop le' })
  email!: string

  @ApiProperty({ format: 'password', writeOnly: true, example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Mat khau phai co toi thieu 8 ky tu' })
  password!: string
}
