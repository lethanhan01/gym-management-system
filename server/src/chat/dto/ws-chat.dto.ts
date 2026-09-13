import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * Payload cho client khi join room cuoc tro chuyen
 */
export class WsJoinConversationDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string
}

/**
 * Payload cho client khi leave room cuoc tro chuyen
 */
export class WsLeaveConversationDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string
}

/**
 * Payload cho client khi gui tin nhan van ban qua WebSocket
 */
export class WsSendMessageDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string

  @IsString({ message: 'content phai la chuoi' })
  @IsNotEmpty({ message: 'content khong duoc de trong' })
  @MinLength(1, { message: 'content toi thieu 1 ky tu' })
  @MaxLength(5000, { message: 'content toi da 5000 ky tu' })
  content: string
}

/**
 * Payload cho client khi bat dau / dung go phim
 */
export class WsTypingDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string
}

/**
 * Payload cho client khi danh dau da xem tin nhan
 */
export class WsMarkSeenDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string
}

/**
 * Payload cho client khi thu hoi tin nhan
 */
export class WsDeleteMessageDto {
  @IsString({ message: 'conversationId phai la chuoi' })
  @IsNotEmpty({ message: 'conversationId khong duoc de trong' })
  conversationId: string

  @IsString({ message: 'messageId phai la chuoi' })
  @IsNotEmpty({ message: 'messageId khong duoc de trong' })
  messageId: string
}

/**
 * Phan hoi Acknowledgement tieu chuan ve cho socket nguoi gui
 */
export interface WsAckResponseDto<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Payload phat su kien user_typing
 */
export interface WsUserTypingPayload {
  conversationId: string
  userId: string
  fullName: string
}

/**
 * Payload phat su kien user_stop_typing
 */
export interface WsUserStopTypingPayload {
  conversationId: string
  userId: string
}

/**
 * Payload phat su kien messages_seen
 */
export interface WsMessagesSeenPayload {
  conversationId: string
  seenByUserId: string
  seenAt: string
}

/**
 * Payload phat su kien message_deleted
 */
export interface WsMessageDeletedPayload {
  conversationId: string
  messageId: string
}
