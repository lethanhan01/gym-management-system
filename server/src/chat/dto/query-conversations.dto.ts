import { IsEnum, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ConversationStatus } from '@prisma/client'

export class QueryConversationsDto {
  @ApiPropertyOptional({
    enum: ConversationStatus,
    description: 'Lọc danh sách theo trạng thái cuộc trò chuyện (active hoặc archived)',
    example: 'active',
  })
  @IsOptional()
  @IsEnum(ConversationStatus, { message: 'Trạng thái phải là active hoặc archived' })
  status?: ConversationStatus
}
