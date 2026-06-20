import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Matches(/^RM-[0-9]{3}$/, { message: 'roomCode phải có dạng RM-XXX' })
  roomCode?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string
}