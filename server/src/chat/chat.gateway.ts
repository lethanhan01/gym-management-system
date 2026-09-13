import {
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { MessageType, UserStatus } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { UsersService, UserWithRoles } from '../auth/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { ChatService } from './chat.service'
import {
  ChatMessageResponseDto,
  WsAckResponseDto,
  WsDeleteMessageDto,
  WsJoinConversationDto,
  WsLeaveConversationDto,
  WsMarkSeenDto,
  WsSendMessageDto,
  WsTypingDto,
  WsUserStopTypingPayload,
  WsUserTypingPayload,
} from './dto'

export interface AuthenticatedSocket extends Socket {
  data: {
    user: UserWithRoles
  }
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  })
)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Xử lý xác thực JWT handshake khi client kết nối tới namespace /chat
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // 1. Trích xuất token từ handshake auth, headers hoặc query
      let token: string | undefined =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string) ||
        (client.handshake.query?.token as string)

      if (!token) {
        this.logger.warn(`[Socket ${client.id}] Từ chối kết nối: Thiếu token`)
        client.disconnect(true)
        return
      }

      if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim()
      }

      // 2. Xác thực chữ ký và thời hạn JWT
      const secret = this.configService.get<string>('JWT_SECRET')
      const payload = await this.jwtService.verifyAsync(token, { secret })

      if (!payload?.sub) {
        this.logger.warn(`[Socket ${client.id}] Từ chối kết nối: Token payload không hợp lệ`)
        client.disconnect(true)
        return
      }

      const userId = BigInt(payload.sub)

      // 3. Nạp thông tin user từ DB để đảm bảo tài khoản active và không bị xóa
      const user = await this.usersService.findByIdWithRoles(userId)
      if (!user || user.deletedAt || user.status !== UserStatus.active) {
        this.logger.warn(`[Socket ${client.id}] Từ chối kết nối: User không hợp lệ hoặc bị khóa`)
        client.disconnect(true)
        return
      }

      // 4. Lưu thông tin user vào socket data và tham gia room cá nhân user_${userId}
      const authClient = client as AuthenticatedSocket
      authClient.data = { user }
      const userRoom = `user_${user.userId.toString()}`
      await client.join(userRoom)


      this.logger.log(`[Socket ${client.id}] User ${user.userId} (${user.fullName}) kết nối thành công, joined room ${userRoom}`)
    } catch (err: any) {
      this.logger.warn(`[Socket ${client.id}] Lỗi xác thực JWT: ${err.message}`)
      client.disconnect(true)
    }
  }

  /**
   * Xử lý khi client ngắt kết nối
   */
  handleDisconnect(client: Socket): void {
    const user = (client as AuthenticatedSocket).data?.user
    if (user) {
      this.logger.log(`[Socket ${client.id}] User ${user.userId} ngắt kết nối`)
    } else {
      this.logger.log(`[Socket ${client.id}] Socket chưa xác thực ngắt kết nối`)
    }
  }

  /**
   * Client yêu cầu join room cuộc trò chuyện
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsJoinConversationDto
  ): Promise<WsAckResponseDto<{ conversationId: string }>> {
    const user = client.data?.user
    if (!user) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' }
    }

    try {
      const conversationId = BigInt(dto.conversationId)
      const conversation = await this.prisma.chatConversation.findUnique({
        where: { conversationId },
        include: { member: true, trainer: true },
      })

      if (!conversation) {
        return { success: false, error: 'NOT_FOUND', message: 'Cuộc trò chuyện không tồn tại' }
      }

      if (conversation.member.userId !== user.userId && conversation.trainer.userId !== user.userId) {
        return {
          success: false,
          error: 'FORBIDDEN',
          message: 'Bạn không có quyền truy cập cuộc trò chuyện này',
        }
      }

      const convRoom = `conv_${dto.conversationId}`
      await client.join(convRoom)
      this.logger.log(`[Socket ${client.id}] User ${user.userId} joined room ${convRoom}`)

      return {
        success: true,
        data: { conversationId: dto.conversationId },
      }
    } catch (err: any) {
      return { success: false, error: 'ERROR', message: err.message }
    }
  }

  /**
   * Client rời room cuộc trò chuyện
   */
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsLeaveConversationDto
  ): Promise<WsAckResponseDto> {
    const convRoom = `conv_${dto.conversationId}`
    await client.leave(convRoom)
    return { success: true }
  }

  /**
   * Gửi tin nhắn văn bản thời gian thực
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsSendMessageDto
  ): Promise<WsAckResponseDto<ChatMessageResponseDto>> {
    const user = client.data?.user
    if (!user) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' }
    }

    try {
      const conversationId = BigInt(dto.conversationId)

      // 1. Lưu tin nhắn qua ChatService
      const message = await this.chatService.createMessage(
        conversationId,
        user.userId,
        dto.content.trim(),
        MessageType.text
      )

      // 2. Broadcast tin nhắn tới room cuộc trò chuyện
      await this.broadcastNewMessage(dto.conversationId, message)

      // 3. Trả về ACK cho người gửi
      return {
        success: true,
        data: message,
      }
    } catch (err: any) {
      const errorCode = err.response?.code || 'ERROR'
      const errorMessage = err.response?.message || err.message
      return {
        success: false,
        error: errorCode,
        message: errorMessage,
      }
    }
  }

  /**
   * Chỉ báo bắt đầu gõ phím (Typing Start)
   */
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsTypingDto
  ): void {
    const user = client.data?.user
    if (!user) return

    const convRoom = `conv_${dto.conversationId}`
    const payload: WsUserTypingPayload = {
      conversationId: dto.conversationId,
      userId: user.userId.toString(),
      fullName: user.fullName || user.email,
    }

    // Broadcast tới các client khác trong room (loại trừ socket người gửi)
    client.to(convRoom).emit('user_typing', payload)
  }

  /**
   * Chỉ báo dừng gõ phím (Typing Stop)
   */
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsTypingDto
  ): void {
    const user = client.data?.user
    if (!user) return

    const convRoom = `conv_${dto.conversationId}`
    const payload: WsUserStopTypingPayload = {
      conversationId: dto.conversationId,
      userId: user.userId.toString(),
    }

    // Broadcast tới các client khác trong room (loại trừ socket người gửi)
    client.to(convRoom).emit('user_stop_typing', payload)
  }

  /**
   * Đánh dấu đã đọc tin nhắn
   */
  @SubscribeMessage('mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsMarkSeenDto
  ): Promise<WsAckResponseDto<{ conversationId: string }>> {
    const user = client.data?.user
    if (!user) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' }
    }

    try {
      const conversationId = BigInt(dto.conversationId)
      const res = await this.chatService.markAsRead(conversationId, user.userId)

      const convRoom = `conv_${dto.conversationId}`
      const payload = {
        conversationId: dto.conversationId,
        seenByUserId: user.userId.toString(),
        seenAt: res.readAt,
      }

      // Broadcast sự kiện messages_seen tới room
      this.server.to(convRoom).emit('messages_seen', payload)

      return {
        success: true,
        data: { conversationId: dto.conversationId },
      }
    } catch (err: any) {
      return { success: false, error: 'ERROR', message: err.message }
    }
  }

  /**
   * Thu hồi tin nhắn (Hard delete)
   */
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: WsDeleteMessageDto
  ): Promise<WsAckResponseDto<{ messageId: string }>> {
    const user = client.data?.user
    if (!user) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' }
    }

    try {
      const messageId = BigInt(dto.messageId)
      await this.chatService.deleteMessage(messageId, user.userId)

      const convRoom = `conv_${dto.conversationId}`
      const payload = {
        conversationId: dto.conversationId,
        messageId: dto.messageId,
      }

      // Broadcast sự kiện message_deleted tới room
      this.server.to(convRoom).emit('message_deleted', payload)

      return {
        success: true,
        data: { messageId: dto.messageId },
      }
    } catch (err: any) {
      const errorCode = err.response?.code || 'ERROR'
      const errorMessage = err.response?.message || err.message
      return {
        success: false,
        error: errorCode,
        message: errorMessage,
      }
    }
  }

  /**
   * Helper phát tin nhắn mới tới room cuộc trò chuyện và room cá nhân của người nhận
   */
  async broadcastNewMessage(
    conversationId: string,
    message: ChatMessageResponseDto
  ): Promise<void> {
    const convRoom = `conv_${conversationId}`
    if (this.server) {
      try {
        const conversation = await this.prisma.chatConversation.findUnique({
          where: { conversationId: BigInt(conversationId) },
          include: { member: true, trainer: true },
        })

        if (conversation) {
          const recipientUserId =
            conversation.member.userId.toString() === message.senderUserId
              ? conversation.trainer.userId.toString()
              : conversation.member.userId.toString()

          const recipientUserRoom = `user_${recipientUserId}`
          // Chaining to(convRoom).to(recipientUserRoom) để Socket.IO tự động deduplicate
          this.server.to(convRoom).to(recipientUserRoom).emit('new_message', message)
        } else {
          this.server.to(convRoom).emit('new_message', message)
        }
      } catch (err: any) {
        this.logger.warn(`Không thể broadcast tới recipient user room: ${err.message}`)
        this.server.to(convRoom).emit('new_message', message)
      }
    }
  }
}
