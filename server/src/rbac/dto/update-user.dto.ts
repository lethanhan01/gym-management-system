import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string

  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, { message: 'phone phải bắt đầu bằng 0, 10-11 chữ số' })
  phone?: string

  @IsOptional()
  @IsEnum(['active', 'pending_verification', 'locked'], { message: 'status chỉ cho phép: active, pending_verification, locked' })
  status?: 'active' | 'pending_verification' | 'locked'

  @IsOptional()
  @IsString()
  avatarFileId?: string
}
