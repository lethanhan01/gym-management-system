import { IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateGroupDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,49}$/, { message: 'name phải lowercase, bắt đầu bằng chữ cái, 2-50 ký tự' })
  name: string

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]
}
