import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn văn bản', maxLength: 2000, example: 'Chào huấn luyện viên, hôm nay em tập bài gì?' })
  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(2000, { message: 'Nội dung tin nhắn tối đa 2000 ký tự' })
  content: string
}
