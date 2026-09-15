import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class QueryMessagesDto {
  @ApiPropertyOptional({ description: 'ID của tin nhắn làm mốc cursor (lấy các tin nhắn trước tin nhắn này)', example: '105' })
  @IsOptional()
  @IsString()
  cursor?: string

  @ApiPropertyOptional({ description: 'Số lượng tin nhắn cần lấy (mặc định 50, tối đa 100)', default: 50, example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  @Max(100, { message: 'Limit tối đa là 100' })
  limit?: number = 50
}
