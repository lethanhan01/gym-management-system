import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PackageStatus } from '@prisma/client'

export class CreatePackageDto {
  @IsOptional()
  @IsString()
  @Matches(/^PKG-[A-Z0-9]{4}$/, {
    message: 'packageCode phải có dạng PKG-XXXX (4 ký tự in hoa/số)',
  })
  packageCode?: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays: number

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  benefits?: string

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus

  @IsOptional()
  @IsBoolean()
  includesPt?: boolean
}
