import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
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

  const mockTrainerUser = {
    userId: BigInt(200),
    email: 'trainer@test.com',
    fullName: 'Coach B',
    status: UserStatus.active,
    deletedAt: null,
    roles: ['trainer'],
    staffId: BigInt(20),
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
    it('nen ngat ket noi neu khong truyen token trong handshake auth/headers/query', async () => {
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

    it('nen ngat ket noi neu payload khong co sub', async () => {
      const mockClient = {
        id: 'sock-2b',
        handshake: { auth: { token: 'token-no-sub' } },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      jwtService.verifyAsync.mockResolvedValue({})

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen ngat ket noi neu user khong ton tai trong DB', async () => {
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

    it('nen ngat ket noi neu user bi xoa mem (deletedAt khong null)', async () => {
      const mockClient = {
        id: 'sock-3b',
        handshake: { auth: { token: 'valid.token' } },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      jwtService.verifyAsync.mockResolvedValue({ sub: '100' })
      usersService.findByIdWithRoles.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      })

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen ngat ket noi neu user co trang thai khong phai active (inactive/banned)', async () => {
      const mockClient = {
        id: 'sock-3c',
        handshake: { auth: { token: 'valid.token' } },
        disconnect: jest.fn(),
        join: jest.fn(),
      } as any

      jwtService.verifyAsync.mockResolvedValue({ sub: '100' })
      usersService.findByIdWithRoles.mockResolvedValue({
        ...mockUser,
        status: UserStatus.locked,
      })

      await gateway.handleConnection(mockClient)

      expect(mockClient.disconnect).toHaveBeenCalledWith(true)
      expect(mockClient.join).not.toHaveBeenCalled()
    })

    it('nen lay token tu query neu auth/headers khong co', async () => {
      const mockClient = {
        id: 'sock-query',
        handshake: { auth: {}, headers: {}, query: { token: 'query.token' } },
        data: {},
        disconnect: jest.fn(),
        join: jest.fn().mockResolvedValue(undefined),
      } as any

      jwtService.verifyAsync.mockResolvedValue({ sub: '100' })
      usersService.findByIdWithRoles.mockResolvedValue(mockUser)

      await gateway.handleConnection(mockClient)

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query.token', { secret: 'test-jwt-secret' })
      expect(mockClient.disconnect).not.toHaveBeenCalled()
      expect(mockClient.join).toHaveBeenCalledWith('user_100')
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
    it('nen xu ly ngat ket noi khi socket da xac thuc', () => {
      const mockClient = {
        id: 'sock-5',
        data: { user: mockUser },
      } as any

      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow()
    })

    it('nen xu ly ngat ket noi khi socket chua xac thuc', () => {
      const mockClient = {
        id: 'sock-5b',
        data: {},
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

    it('nen join room conv_${id} thanh cong neu caller la Member trong cuoc tro chuyen', async () => {
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

    it('nen join room conv_${id} thanh cong neu caller la Trainer trong cuoc tro chuyen', async () => {
      const mockClient = { id: 'sock-9b', data: { user: mockTrainerUser }, join: jest.fn().mockResolvedValue(undefined) } as any
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '1' })

      expect(mockClient.join).toHaveBeenCalledWith('conv_1')
      expect(res).toEqual({ success: true, data: { conversationId: '1' } })
    })

    it('nen bat loi an toan va tra ve error ERROR neu co exception ngoai y muon', async () => {
      const mockClient = { id: 'sock-err', data: { user: mockUser }, join: jest.fn() } as any
      prisma.chatConversation.findUnique.mockRejectedValue(new Error('DB Connection Timeout'))

      const res = await gateway.handleJoinConversation(mockClient, { conversationId: '1' })

      expect(res).toEqual({ success: false, error: 'ERROR', message: 'DB Connection Timeout' })
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
    it('nen tra ve UNAUTHORIZED neu socket chua gan user', async () => {
      const mockClient = { id: 'sock-unauth', data: {} } as any
      const res = await gateway.handleSendMessage(mockClient, {
        conversationId: '1',
        content: 'Test message',
      })

      expect(res).toEqual({ success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' })
    })

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

    it('nen tra ve loi ACK FORBIDDEN neu user khong co quyen gui tin nhan', async () => {
      const mockClient = { id: 'sock-12b', data: { user: mockUser } } as any
      chatService.createMessage.mockRejectedValue(
        new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền gửi tin nhắn',
        })
      )

      const res = await gateway.handleSendMessage(mockClient, {
        conversationId: '1',
        content: 'Tin nhắn cấm',
      })

      expect(res).toEqual({
        success: false,
        error: 'FORBIDDEN',
        message: 'Bạn không có quyền gửi tin nhắn',
      })
    })
  })

  describe('typing_start & typing_stop', () => {
    it('typing_start khong lam gi neu socket chua xac thuc', () => {
      const mockClient = {
        id: 'sock-unauth-typing',
        data: {},
        to: jest.fn(),
      } as any

      gateway.handleTypingStart(mockClient, { conversationId: '1' })

      expect(mockClient.to).not.toHaveBeenCalled()
    })

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

    it('typing_start nen dung email neu fullName bi null hoac rong', () => {
      const mockEmitToRoom = jest.fn()
      const userWithoutName = { ...mockUser, fullName: '' }
      const mockClient = {
        id: 'sock-13b',
        data: { user: userWithoutName },
        to: jest.fn().mockReturnValue({ emit: mockEmitToRoom }),
      } as any

      gateway.handleTypingStart(mockClient, { conversationId: '1' })

      expect(mockEmitToRoom).toHaveBeenCalledWith('user_typing', {
        conversationId: '1',
        userId: '100',
        fullName: 'member@test.com',
      })
    })

    it('typing_stop khong lam gi neu socket chua xac thuc', () => {
      const mockClient = {
        id: 'sock-unauth-stop-typing',
        data: {},
        to: jest.fn(),
      } as any

      gateway.handleTypingStop(mockClient, { conversationId: '1' })

      expect(mockClient.to).not.toHaveBeenCalled()
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
    it('nen tra ve UNAUTHORIZED neu socket chua gan user', async () => {
      const mockClient = { id: 'sock-unauth-seen', data: {} } as any
      const res = await gateway.handleMarkSeen(mockClient, { conversationId: '1' })

      expect(res).toEqual({ success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' })
    })

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

    it('nen bat loi va tra ve error ERROR neu chatService nem loi', async () => {
      const mockClient = { id: 'sock-15-err', data: { user: mockUser } } as any
      chatService.markAsRead.mockRejectedValue(new Error('Mark read error'))

      const res = await gateway.handleMarkSeen(mockClient, { conversationId: '1' })

      expect(res).toEqual({ success: false, error: 'ERROR', message: 'Mark read error' })
    })
  })

  describe('handleDeleteMessage', () => {
    it('nen tra ve UNAUTHORIZED neu socket chua gan user', async () => {
      const mockClient = { id: 'sock-unauth-del', data: {} } as any
      const res = await gateway.handleDeleteMessage(mockClient, {
        conversationId: '1',
        messageId: '10',
      })

      expect(res).toEqual({ success: false, error: 'UNAUTHORIZED', message: 'Chưa xác thực' })
    })

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

    it('nen tra ve loi ACK NOT_FOUND neu tin nhan khong ton tai', async () => {
      const mockClient = { id: 'sock-17b', data: { user: mockUser } } as any
      chatService.deleteMessage.mockRejectedValue(
        new NotFoundException({
          success: false,
          code: 'NOT_FOUND',
          message: 'Tin nhắn không tồn tại',
        })
      )

      const res = await gateway.handleDeleteMessage(mockClient, {
        conversationId: '1',
        messageId: '999',
      })

      expect(res).toEqual({
        success: false,
        error: 'NOT_FOUND',
        message: 'Tin nhắn không tồn tại',
      })
    })
  })

  describe('broadcastNewMessage', () => {
    it('nen broadcast new_message toi room cuoc tro chuyen va room nguoi nhan khi nguoi gui la Member', async () => {
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '20',
        conversationId: '2',
        senderUserId: '100',
        senderName: 'Nguyen Van A',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'text',
        content: 'Em chào thầy',
        attachmentUrl: null,
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
      expect(mockEmitter.to).toHaveBeenCalledWith('user_200')
      expect(mockEmitter.emit).toHaveBeenCalledWith('new_message', mockCreatedMsg)
    })

    it('nen broadcast new_message toi room cuoc tro chuyen va room nguoi nhan khi nguoi gui la Trainer', async () => {
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '21',
        conversationId: '2',
        senderUserId: '200',
        senderName: 'Coach B',
        senderAvatarUrl: null,
        isSender: true,
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

    it('nen fallback broadcast toi room conv_${id} neu khong tim thay conversation trong DB', async () => {
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '22',
        conversationId: '99',
        senderUserId: '100',
        senderName: 'Nguyen Van A',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'text',
        content: 'Fallback test',
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
      }

      prisma.chatConversation.findUnique.mockResolvedValue(null)

      const mockEmitter = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      }
      ;(gateway.server.to as jest.Mock).mockReturnValue(mockEmitter)

      await gateway.broadcastNewMessage('99', mockCreatedMsg)

      expect(gateway.server.to).toHaveBeenCalledWith('conv_99')
      expect(mockEmitter.emit).toHaveBeenCalledWith('new_message', mockCreatedMsg)
    })

    it('nen fallback broadcast an toan neu Prisma nem loi trong qua trinh tim recipient', async () => {
      const mockCreatedMsg: ChatMessageResponseDto = {
        messageId: '23',
        conversationId: '2',
        senderUserId: '100',
        senderName: 'Nguyen Van A',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'text',
        content: 'Error fallback test',
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
      }

      prisma.chatConversation.findUnique.mockRejectedValue(new Error('DB Query Failed'))

      const mockEmitter = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      }
      ;(gateway.server.to as jest.Mock).mockReturnValue(mockEmitter)

      await gateway.broadcastNewMessage('2', mockCreatedMsg)

      expect(gateway.server.to).toHaveBeenCalledWith('conv_2')
      expect(mockEmitter.emit).toHaveBeenCalledWith('new_message', mockCreatedMsg)
    })
  })
})
