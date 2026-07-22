import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LineLoginDto {
  @ApiProperty({ writeOnly: true, description: 'LINE ID token do LIFF cấp.', example: '<LINE_ID_TOKEN>' })
  @IsString()
  @IsNotEmpty()
  idToken!: string
}
