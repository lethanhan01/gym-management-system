import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
  @ApiProperty({ format: 'password', writeOnly: true, example: 'NewPass456!' })
  @IsString()
  @MinLength(8, { message: 'Mat khau moi phai co toi thieu 8 ky tu' })
  newPassword!: string
}
