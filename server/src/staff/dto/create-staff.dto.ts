import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

const STAFF_POSITIONS = ['owner', 'staff', 'trainer', 'member'] as const
export type StaffPosition = (typeof STAFF_POSITIONS)[number]

export class CreateStaffDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  fullName!: string

  @IsString()
  @IsNotEmpty()
  @IsIn(STAFF_POSITIONS)
  position!: StaffPosition

  @IsOptional()
  groupIds?: string[]
}
