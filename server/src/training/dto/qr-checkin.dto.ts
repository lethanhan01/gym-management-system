import { IsString, MinLength } from 'class-validator'

export class QrCheckinDto {
  @IsString()
  @MinLength(1)
  token!: string
}
