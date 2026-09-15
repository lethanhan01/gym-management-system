import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 200, { message: 'Họ và tên phải từ 2 đến 200 ký tự' })
  fullName?: string

  @IsOptional()
  @IsString()
  @Length(0, 20, { message: 'Số điện thoại tối đa 20 ký tự' })
  phone?: string | null

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Chuyên môn tối đa 100 ký tự' })
  specialty?: string | null

  @IsOptional()
  @IsInt({ message: 'Số năm kinh nghiệm phải là số nguyên' })
  @Min(0, { message: 'Số năm kinh nghiệm tối thiểu là 0' })
  @Max(50, { message: 'Số năm kinh nghiệm tối đa là 50' })
  experienceYears?: number | null

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Tiểu sử tối đa 1.000 ký tự' })
  bio?: string | null
}
