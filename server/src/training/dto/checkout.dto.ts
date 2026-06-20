import { IsDateString } from 'class-validator'

export class CheckoutDto {
  @IsDateString()
  endedAt!: string
}