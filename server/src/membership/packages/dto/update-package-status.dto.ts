import { IsEnum } from 'class-validator'
import { PackageStatus } from '@prisma/client'

export class UpdatePackageStatusDto {
  @IsEnum(PackageStatus)
  status: PackageStatus
}
