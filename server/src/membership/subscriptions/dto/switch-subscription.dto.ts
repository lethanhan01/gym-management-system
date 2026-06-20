import { IsInt, Min } from 'class-validator'

export class SwitchSubscriptionDto {
  @IsInt()
  @Min(1)
  newPackageId: number
}
