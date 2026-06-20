import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, ValidateNested } from 'class-validator'
import { StaffShift } from '@prisma/client'

export class ScheduleEntryDto {
  @IsEnum(StaffShift)
  shift!: StaffShift

  @IsDateString()
  workDate!: string
}

export class CreateScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  schedules!: ScheduleEntryDto[]
}
