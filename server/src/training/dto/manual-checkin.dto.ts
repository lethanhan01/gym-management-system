import { IsString, IsNotEmpty, IsDateString } from 'class-validator'

export class ManualCheckinDto {
  @IsString()
  @IsNotEmpty()
  memberCode!: string

  @IsDateString()
  occurredAt!: string
}