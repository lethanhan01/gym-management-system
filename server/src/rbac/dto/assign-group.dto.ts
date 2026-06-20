import { IsString } from 'class-validator'

export class AssignGroupDto {
  @IsString()
  groupId: string
}
