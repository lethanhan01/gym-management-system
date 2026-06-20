import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { PackageStatus } from '@prisma/client'

export class ListPackagesDto {
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
  @IsIn([PackageStatus.active, PackageStatus.inactive, 'deleted'] as string[])
  status?: PackageStatus | 'deleted'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minDuration?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDuration?: number

  @IsOptional()
  @IsString()
  minPrice?: string

  @IsOptional()
  @IsString()
  maxPrice?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false

  @IsOptional()
  @IsString()
  sort?: string = 'created_at:desc'
}
