import { IsEnum } from 'class-validator'

export class UpdateSessionStatusDto {
  @IsEnum(['in_progress', 'completed'])
  status: 'in_progress' | 'completed'
}
