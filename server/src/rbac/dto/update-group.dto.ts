import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,49}$/, { message: 'name phải lowercase, bắt đầu bằng chữ cái, 2-50 ký tự' })
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string
}
