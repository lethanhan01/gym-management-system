import { ArrayMinSize, IsArray, IsString } from 'class-validator'

export class AssignPermissionsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'permissions: must contain at least 1 item' })
  @IsString({ each: true })
  permissions: string[]
}
