import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateMaintenanceLogDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string
}