import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { UserStatus } from '@prisma/client'
import { UsersService } from '../auth/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { ChatMessageResponseDto } from './dto'

describe('ChatGateway', () => {
  let gateway: ChatGateway
  let jwtService: { verifyAsync: jest.Mock }
  let configService: { get: jest.Mock }
  let usersService: { findByIdWithRoles: jest.Mock }
  let chatService: {
    createMessage: jest.Mock
    markAsRead: jest.Mock
    deleteMessage: jest.Mock
  }
  let prisma: {
    chatConversation: {
      findUnique: jest.Mock
    }
  }

  const mockUser = {
    userId: BigInt(100),
    email: 'member@test.com',
    fullName: 'Nguyen Van A',
    status: UserStatus.active,
    deletedAt: null,
    roles: ['member'],
    memberId: BigInt(10),
  }


  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    }
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret'
        return null
      }),
    }
    usersService = {
      findByIdWithRoles: jest.fn(),
    }
    chatService = {
      createMessage: jest.fn(),
      markAsRead: jest.fn(),
      deleteMessage: jest.fn(),
    }
    prisma = {
      chatConversation: {
        findUnique: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        { provide: ChatService, useValue: chatService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    gateway = module.get<ChatGateway>(ChatGateway)

    // Mock Socket.io Server instance hỗ trợ chaining .to().to().emit()
    const createMockRoomEmitter = () => {
      const emitter: any = {
        to: jest.fn(),
        emit: jest.fn(),
      }
      emitter.to.mockReturnValue(emitter)
      return emitter
    }

    const mockEmitter = createMockRoomEmitter()
    gateway.server = {
      to: jest.fn().mockReturnValue(mockEmitter),
      emit: jest.fn(),
    } as any
  })

  describe('handleConnection', () => {
    it('nen ngat ket noi neu khong truyen token trong handshake', async () => {
      const mockClient = {
        id: 'sock-1',
        handshake: { auth: {}, headers: {}, query: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen ngat ket noi neu jwtService.verifyAsync nem loi (token het han / sai signature)', async () => {
      const mockClient = {
        id: 'sock-2',
        handshake: { auth: { token: 'invalid.jwt.token' } },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'))

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen ngat ket noi neu user khong ton tai hoac bi xoa / khoa trong DB', async () => {
      const mockClient = {
        id: 'sock-3',
        handshake: { headers: { authorization: 'Bearer valid.jwt.token' } },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      jwtService.verifyAsync.mockResolvedValue({ sub: '100' })
      usersService.findByIdWithRoles.mockResolvedValue(null)

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen ket noi thanh cong va join room ca nhan user_${userId} khi token hop le', async () => {
      const mockClient = {
        id: 'sock-4',
        handshake: { auth: { token: 'valid.token' } },
        data: {},
        disconnect: jest.fn(),
        join: jest.fn().mockResolvedValue(undefined),
      } as any

      jwtService.verifyAsync.mockResolvedValue({ sub: '100' })
      usersService.findByIdWithRoles.mockResolvedValue(mockUser)

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).not.toHaveBeenCalled()
      expect(mockClient.join).toHaveBeenCalledWith('user_100')
      expect(mockClient.data.user).toEqual(mockUser)
    })
  })

  describe('handleDisconnect', () => {
    it('nen xu ly ngat ket noi khong gay exception', () => {
      const mockClient = {
        id: 'sock-5',
        data: { user: mockUser },
      } as any

      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow()
    })
  })

  describe('handleJoinConversation', () => {
    it('nen tra ve UNAUTHORIZED neu socket chua gan user', async () => {
      const mockClient = { id: 'sock-6', data: {} } as any
      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '1' })

      expect(res).toEqual({ success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' })
    })

    it('nen tra ve NOT_FOUND neu cuoc tro chuyen khong ton tai', async () => {
      const mockClient = { id: 'sock-7', data: { user: mockUser }, join: jest.fn() } as any
      prisma.chatConversation.findUnique.mockResolvedValue(null)

      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '999' })

      expect(res).toEqual({ success: false, error: 'NOT_FOUND', message: 'Cuộc trò chuyện không tồn tại' })
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen tra ve FORBIDDEN neu user khong thuoc cuoc tro chuyen', async () => {
      const mockClient = { id: 'sock-8', data: { user: mockUser }, join: jest.fn() } as any
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(555) },
        trainer: { userId: BigInt(666) },
      })

      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '1' })

      expect(res).toEqual({
        success: false,
        error: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập cuộc trò chuyện này',
      })
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen join room conv_${id} thanh cong neu user la thanh vien hop le', async () => {
      const mockClient = { id: 'sock-9', data: { user: mockUser }, join: jest.fn().mockResolvedValue(undefined) } as any
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '1' })

      expect(mockClient.join).toHaveBeenCalledWith('conv_1')
      expect(res).toEqual({ success: true, data: { conversationId: '1' } })
    })
  })

  describe('handleLeaveConversation', () => {
    it('nen leave room conv_${id} thanh cong', async () => {
      const mockClient = { id: 'sock-10', leave: jest.fn().mockResolvedValue(undefined) } as any
      const res = await gateway.handleLeaveConversation(mockClient, { conversationId: '1' })

      expect(mockClient.leave).toHaveBeenCalledWith('conv_1')
      expect(res).toEqual({ success: true })
    })
  })

  describe('handleSendMessage', () => {
    it('nen luu tin nhan qua chatService va broadcast new_message', async () => {
      const mockClient = { id: 'sock-11', data: { user: mockUser } } as any
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '10',
        conversationId: '1',
        senderUserId: '100',
        senderName: 'Nguyen Van A',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'text',
        content: 'Xin chào HLV',
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
      }

      chatService.createMessage.mockResolvedValue(mockCreatedMsg)
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockEmitter = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      }
      ;(gateway.server.to as jest.Mock).mockReturnValue(mockEmitter)

      const res = await gateway.handleSendMessage(mockClient, {
        conversationId: '1',
        content: 'Xin chào HLV',
      })

      expect(chatService.createMessage).toHaveBeenCalledWith(
        BigInt(1),
        BigInt(100),
        'Xin chào HLV',
        'text'
      )
      expect(gateway.server.to).toHaveBeenCalledWith('conv_1')
      expect(mockEmitter.to).toHaveBeenCalledWith('user_200')
      expect(mockEmitter.emit).toHaveBeenCalledWith('new_message', mockCreatedMsg)
      expect(res).toEqual({ success: true, data: mockCreatedMsg })
    })

    it('nen tra ve loi ACK neu hoi thoai bi archived', async () => {
      const mockClient = { id: 'sock-12', data: { user: mockUser } } as any
      chatService.createMessage.mockRejectedValue(
        new BadRequestException({
          success: false,
          code: 'CONVERSATION_ARCHIVED',
          message: 'Cuộc trò chuyện đã lưu trữ',
        })
      )

      const res = await gateway.handleSendMessage(mockClient, {
        conversationId: '1',
        content: 'Tin nhắn lỗi',
      })

      expect(res).toEqual({
        success: false,
        error: 'CONVERSATION_ARCHIVED',
        message: 'Cuộc trò chuyện đã lưu trữ',
      })
    })
  })

  describe('typing_start & typing_stop', () => {
    it('typing_start nen broadcast user_typing toi room conv_${id} ngoai tru sender', () => {
      const mockEmitToRoom = jest.fn()
      const mockClient = {
        id: 'sock-13',
        data: { user: mockUser },
        to: jest.fn().mockReturnValue({ emit: mockEmitToRoom }),
      } as any

      gateway.handleTypingStart(mockClient, { conversationId: '1' })

      expect(mockClient.to).toHaveBeenCalledWith('conv_1')
      expect(mockEmitToRoom).toHaveBeenCalledWith('user_typing', {
        conversationId: '1',
        userId: '100',
        fullName: 'Nguyen Van A',
      })
    })

    it('typing_stop nen broadcast user_stop_typing toi room conv_${id} ngoai tru sender', () => {
      const mockEmitToRoom = jest.fn()
      const mockClient = {
        id: 'sock-14',
        data: { user: mockUser },
        to: jest.fn().mockReturnValue({ emit: mockEmitToRoom }),
      } as any

      gateway.handleTypingStop(mockClient, { conversationId: '1' })

      expect(mockClient.to).toHaveBeenCalledWith('conv_1')
      expect(mockEmitToRoom).toHaveBeenCalledWith('user_stop_typing', {
        conversationId: '1',
        userId: '100',
      })
    })
  })

  describe('handleMarkSeen', () => {
    it('nen cap nhat da doc qua chatService va broadcast messages_seen', async () => {
      const mockClient = { id: 'sock-15', data: { user: mockUser } } as any
      const mockReadTime = new Date().toISOString()
      chatService.markAsRead.mockResolvedValue({
        conversationId: '1',
        readAt: mockReadTime,
      })

      const mockEmit = jest.fn()
      ;(gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit })

      const res = await gateway.handleMarkSeen(mockClient, { conversationId: '1' })

      expect(chatService.markAsRead).toHaveBeenCalledWith(BigInt(1), BigInt(100))
      expect(gateway.server.to).toHaveBeenCalledWith('conv_1')
      expect(mockEmit).toHaveBeenCalledWith('messages_seen', {
        conversationId: '1',
        seenByUserId: '100',
        seenAt: mockReadTime,
      })
      expect(res).toEqual({ success: true, data: { conversationId: '1' } })
    })
  })

  describe('handleDeleteMessage', () => {
    it('nen thu hoi tin nhan va broadcast message_deleted', async () => {
      const mockClient = { id: 'sock-16', data: { user: mockUser } } as any
      chatService.deleteMessage.mockResolvedValue({
        messageId: '10',
        conversationId: '1',
      })

      const mockEmit = jest.fn()
      ;(gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit })

      const res = await gateway.handleDeleteMessage(mockClient, {
        conversationId: '1',
        messageId: '10',
      })

      expect(chatService.deleteMessage).toHaveBeenCalledWith(BigInt(10), BigInt(100))
      expect(gateway.server.to).toHaveBeenCalledWith('conv_1')
      expect(mockEmit).toHaveBeenCalledWith('message_deleted', {
        conversationId: '1',
        messageId: '10',
      })
      expect(res).toEqual({ success: true, data: { messageId: '10' } })
    })

    it('nen tra ve loi ACK neu khong phai nguoi gui thu hoi', async () => {
      const mockClient = { id: 'sock-17', data: { user: mockUser } } as any
      chatService.deleteMessage.mockRejectedValue(
        new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Chỉ người gửi mới có quyền thu hồi tin nhắn',
        })
      )

      const res = await gateway.handleDeleteMessage(mockClient, {
        conversationId: '1',
        messageId: '10',
      })

      expect(res).toEqual({
        success: false,
        error: 'FORBIDDEN',
        message: 'Chỉ người gửi mới có quyền thu hồi tin nhắn',
      })
    })
  })

  describe('broadcastNewMessage', () => {
    it('nen broadcast new_message toi room cuoc tro chuyen va room nguoi nhan', async () => {
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '20',
        conversationId: '2',
        senderUserId: '200',
        senderName: 'Tran Van B (PT)',
        senderAvatarUrl: null,
        isSender: false,
        messageType: 'image',
        content: 'plan.png',
        attachmentUrl: '/uploads/chat/plan.png',
        createdAt: new Date().toISOString(),
      }

      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(2),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockEmitter = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      }
      ;(gateway.server.to as jest.Mock).mockReturnValue(mockEmitter)

      await gateway.broadcastNewMessage('2', mockCreatedMsg)

      expect(gateway.server.to).toHaveBeenCalledWith('conv_2')
      expect(mockEmitter.to).toHaveBeenCalledWith('user_100')
      expect(mockEmitter.emit).toHaveBeenCalledWith('new_message', mockCreatedMsg)
    })
  })
})
