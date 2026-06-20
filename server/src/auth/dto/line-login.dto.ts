import { IsString, IsNotEmpty } from 'class-validator'

export class LineLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string
}
