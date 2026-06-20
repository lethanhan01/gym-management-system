import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  groupId?: string

  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @IsEnum(['pending_verification', 'active', 'locked'])
  status?: 'pending_verification' | 'active' | 'locked'

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeDeleted?: boolean = false

  @IsOptional()
  @IsString()
  sort?: string = 'created_at:desc'
}
