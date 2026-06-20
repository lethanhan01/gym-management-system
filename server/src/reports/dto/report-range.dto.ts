import { IsIn, IsOptional, IsString } from 'class-validator'

export class ReportRangeDto {
  @IsString() from!: string
  @IsString() to!: string
  @IsOptional() @IsIn(['cash', 'bank_card', 'ewallet']) method?: string
}

export class StaffPerformanceQueryDto extends ReportRangeDto {
  @IsOptional() @IsString() staffId?: string
}
