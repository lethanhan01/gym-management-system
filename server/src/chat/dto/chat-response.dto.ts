export interface ConversationParticipant {
  userId: string
  fullName: string
  avatarUrl: string | null
  role: 'member' | 'trainer'
  memberId?: string
  staffId?: string
  specialty?: string | null
}

export interface ConversationSummaryDto {
  conversationId: string
  status: 'active' | 'archived'
  participant: ConversationParticipant
  lastMessageContent: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessageResponseDto {
  messageId: string
  conversationId: string
  senderUserId: string
  senderName: string
  senderAvatarUrl: string | null
  isSender: boolean
  messageType: 'text' | 'image'
  content: string
  attachmentUrl: string | null
  createdAt: string
}

export interface MessagesListResponseDto {
  messages: ChatMessageResponseDto[]
  nextCursor: string | null
  hasMore: boolean
}
