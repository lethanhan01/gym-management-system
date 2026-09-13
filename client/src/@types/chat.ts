export type MessageDeliveryStatus = 'sending' | 'sent' | 'failed'
export type ConversationStatus = 'active' | 'archived'
export type MessageType = 'text' | 'image'

export interface ConversationParticipant {
  userId: string
  fullName: string
  avatarUrl: string | null
  role: 'member' | 'trainer'
  memberId?: string
  memberCode?: string
  staffId?: string
  specialty?: string | null
}

export interface ConversationSummary {
  conversationId: string
  status: ConversationStatus
  participant: ConversationParticipant
  lastMessageContent: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  messageId: string
  conversationId: string
  senderUserId: string
  senderName: string
  senderAvatarUrl: string | null
  isSender: boolean
  messageType: MessageType
  content: string
  attachmentUrl: string | null
  createdAt: string
  // Trạng thái cục bộ cho Optimistic UI
  deliveryStatus?: MessageDeliveryStatus
  tempId?: string
  errorText?: string
}

export interface MessagesListResponse {
  messages: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

export interface UploadAttachmentResponse {
  message: ChatMessage
}

export interface WsTypingPayload {
  conversationId: string
  userId: string
  fullName: string
}

export interface WsUserStopTypingPayload {
  conversationId: string
  userId: string
}

export interface WsMessagesSeenPayload {
  conversationId: string
  seenByUserId: string
  seenAt: string
}

export interface WsMessageDeletedPayload {
  conversationId: string
  messageId: string
}

export interface WsAckResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
