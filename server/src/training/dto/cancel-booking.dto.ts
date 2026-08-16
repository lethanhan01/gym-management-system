import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  reason!: string
}
