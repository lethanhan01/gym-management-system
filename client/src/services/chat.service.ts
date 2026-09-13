import { io, Socket } from 'socket.io-client'
import api from './api'
import type {
  ChatMessage,
  ConversationSummary,
  MessagesListResponse,
  WsAckResponse,
  WsMessageDeletedPayload,
  WsMessagesSeenPayload,
  WsTypingPayload,
  WsUserStopTypingPayload,
} from '@/@types/chat'

class ChatService {
  private socket: Socket | null = null

  // ==========================================
  // REST API METHODS
  // ==========================================

  /**
   * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
   */
  async getConversations(): Promise<ConversationSummary[]> {
    const res = await api.get<{
      success: boolean
      data: { conversations: ConversationSummary[] }
    }>('/chat/conversations')
    return res.data.data.conversations
  }

  /**
   * Lấy cuộc trò chuyện đang hoạt động với PT chính của Hội viên
   */
  async getActiveConversation(): Promise<ConversationSummary | null> {
    const res = await api.get<{
      success: boolean
      data: { conversation: ConversationSummary | null }
    }>('/chat/conversations/active')
    return res.data.data.conversation
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện (hỗ trợ phân trang cursor)
   */
  async getMessages(
    conversationId: string,
    cursor?: string | null,
    limit = 30
  ): Promise<MessagesListResponse> {
    const params: Record<string, any> = { limit }
    if (cursor) {
      params.cursor = cursor
    }

    const res = await api.get<{
      success: boolean
      data: MessagesListResponse
    }>(`/chat/conversations/${conversationId}/messages`, { params })
    return res.data.data
  }

  /**
   * Tải ảnh đính kèm lên qua REST và nhận về tin nhắn ảnh đã tạo
   */
  async uploadAttachment(conversationId: string, file: File): Promise<ChatMessage> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post<{
      success: boolean
      data: { message: ChatMessage }
    }>(`/chat/conversations/${conversationId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data.message
  }

  /**
   * Thu hồi tin nhắn qua REST API (dự phòng khi mất kết nối WebSocket)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const res = await api.delete<{
      success: boolean
      data: { messageId: string }
    }>(`/chat/messages/${messageId}`)
    return res.data.success
  }

  /**
   * Đánh dấu đã đọc qua REST API
   */
  async markAsRead(conversationId: string): Promise<{ conversationId: string; readAt: string }> {
    const res = await api.post<{
      success: boolean
      data: { conversationId: string; readAt: string }
    }>(`/chat/conversations/${conversationId}/read`)
    return res.data.data
  }

  // ==========================================
  // WEBSOCKET REAL-TIME SOCKET MANAGER
  // ==========================================

  /**
   * Khởi tạo kết nối Socket.IO tới namespace /chat
   */
  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    // Nếu đã có instance cũ chưa connected thì ngắt trước khi tạo mới
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    const baseUrl =
      import.meta.env.VITE_WS_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

    // Kết nối tới namespace /chat
    const socketUrl = `${baseUrl.replace(/\/+$/, '')}/chat`

    this.socket = io(socketUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    return this.socket
  }

  /**
   * Ngắt kết nối socket hiện tại và giải phóng listeners
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * Lấy socket instance hiện tại
   */
  getSocket(): Socket | null {
    return this.socket
  }

  /**
   * Kiểm tra socket có đang kết nối không
   */
  isConnected(): boolean {
    return !!this.socket?.connected
  }

  /**
   * Yêu cầu tham gia room cuộc trò chuyện
   */
  joinConversation(conversationId: string): Promise<WsAckResponse<{ conversationId: string }>> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        return resolve({
          success: false,
          error: 'SOCKET_DISCONNECTED',
          message: 'Chưa kết nối Socket',
        })
      }

      this.socket.emit(
        'join_conversation',
        { conversationId },
        (ack: WsAckResponse<{ conversationId: string }>) => {
          resolve(ack || { success: true, data: { conversationId } })
        }
      )
    })
  }

  /**
   * Rời khỏi room cuộc trò chuyện
   */
  leaveConversation(conversationId: string): Promise<WsAckResponse> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        return resolve({ success: true })
      }

      this.socket.emit('leave_conversation', { conversationId }, (ack: WsAckResponse) => {
        resolve(ack || { success: true })
      })
    })
  }

  /**
   * Gửi tin nhắn mới qua WebSocket
   */
  sendMessage(
    conversationId: string,
    content: string
  ): Promise<WsAckResponse<ChatMessage>> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        return resolve({
          success: false,
          error: 'SOCKET_DISCONNECTED',
          message: 'Mất kết nối mạng. Không thể gửi tin nhắn.',
        })
      }

      this.socket.emit(
        'send_message',
        { conversationId, content },
        (ack: WsAckResponse<ChatMessage>) => {
          if (!ack) {
            return resolve({
              success: false,
              error: 'NO_ACK',
              message: 'Không nhận được phản hồi từ máy chủ.',
            })
          }
          resolve(ack)
        }
      )
    })
  }

  /**
   * Phát sự kiện bắt đầu gõ phím
   */
  sendTypingStart(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId })
    }
  }

  /**
   * Phát sự kiện dừng gõ phím
   */
  sendTypingStop(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId })
    }
  }

  /**
   * Đánh dấu đã xem tin nhắn qua WebSocket
   */
  markSeen(conversationId: string): Promise<WsAckResponse<{ conversationId: string }>> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        return resolve({ success: true, data: { conversationId } })
      }

      this.socket.emit('mark_seen', { conversationId }, (ack: WsAckResponse<{ conversationId: string }>) => {
        resolve(ack || { success: true, data: { conversationId } })
      })
    })
  }

  /**
   * Thu hồi tin nhắn qua WebSocket
   */
  deleteMessageViaSocket(
    conversationId: string,
    messageId: string
  ): Promise<WsAckResponse<{ messageId: string }>> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        return resolve({
          success: false,
          error: 'SOCKET_DISCONNECTED',
          message: 'Chưa kết nối Socket',
        })
      }

      this.socket.emit(
        'delete_message',
        { conversationId, messageId },
        (ack: WsAckResponse<{ messageId: string }>) => {
          resolve(ack || { success: true, data: { messageId } })
        }
      )
    })
  }

  // ==========================================
  // REAL-TIME EVENT SUBSCRIPTIONS
  // ==========================================

  onNewMessage(callback: (message: ChatMessage) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('new_message', callback)
    return () => {
      this.socket?.off('new_message', callback)
    }
  }

  onUserTyping(callback: (payload: WsTypingPayload) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('user_typing', callback)
    return () => {
      this.socket?.off('user_typing', callback)
    }
  }

  onUserStopTyping(callback: (payload: WsUserStopTypingPayload) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('user_stop_typing', callback)
    return () => {
      this.socket?.off('user_stop_typing', callback)
    }
  }

  onMessagesSeen(callback: (payload: WsMessagesSeenPayload) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('messages_seen', callback)
    return () => {
      this.socket?.off('messages_seen', callback)
    }
  }

  onMessageDeleted(callback: (payload: WsMessageDeletedPayload) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('message_deleted', callback)
    return () => {
      this.socket?.off('message_deleted', callback)
    }
  }

  onConnect(callback: () => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('connect', callback)
    return () => {
      this.socket?.off('connect', callback)
    }
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    if (!this.socket) return () => {}
    this.socket.on('disconnect', callback)
    return () => {
      this.socket?.off('disconnect', callback)
    }
  }
}

export const chatService = new ChatService()
export default chatService
