import { IsIn, IsOptional, IsString, Length } from 'class-validator'

const STAFF_POSITIONS = ['owner', 'staff', 'trainer', 'member'] as const
export type StaffPosition = (typeof STAFF_POSITIONS)[number]

export class UpdateStaffDto {
  @IsOptional() @IsString() @Length(2, 200)
  fullName?: string | null

  @IsOptional() @IsString() @Length(0, 20)
  phone?: string | null

  @IsOptional() @IsString() @IsIn(STAFF_POSITIONS)
  position?: StaffPosition | null
}
