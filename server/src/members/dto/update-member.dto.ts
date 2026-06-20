import { IsDateString, IsOptional, IsString, Length } from 'class-validator'

export class UpdateMemberDto {
  @IsOptional() @IsString() @Length(2, 100) fullName?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsDateString() dateOfBirth?: string
  @IsOptional() @IsString() @Length(0, 200) address?: string
}
