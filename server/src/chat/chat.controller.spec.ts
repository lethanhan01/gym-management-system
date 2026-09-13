import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { ChatController } from './chat.controller'
import { ChatService, ChatUploadedFile } from './chat.service'

describe('ChatController', () => {
  let controller: ChatController
  let chatService: {
    getConversationsForUser: jest.Mock
    getActiveConversationForMember: jest.Mock
    getMessages: jest.Mock
    createMessage: jest.Mock
    uploadAttachmentAndCreateMessage: jest.Mock
    markAsRead: jest.Mock
    deleteMessage: jest.Mock
  }

  const mockUser: AuthenticatedUser = {
    userId: BigInt(100),
    email: 'member@test.com',
    roles: ['member' as any],
    memberId: BigInt(10),
  }

  beforeEach(async () => {
    chatService = {
      getConversationsForUser: jest.fn(),
      getActiveConversationForMember: jest.fn(),
      getMessages: jest.fn(),
      createMessage: jest.fn(),
      uploadAttachmentAndCreateMessage: jest.fn(),
      markAsRead: jest.fn(),
      deleteMessage: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatService }],
    }).compile()

    controller = module.get<ChatController>(ChatController)
  })

  describe('getConversations', () => {
    it('nen tra ve danh sach cuoc tro chuyen cua user', async () => {
      const mockResult = [{ conversationId: '1', status: 'active', unreadCount: 2 }]
      chatService.getConversationsForUser.mockResolvedValue(mockResult)

      const res = await controller.getConversations(mockUser, { status: 'active' as any })

      expect(chatService.getConversationsForUser).toHaveBeenCalledWith(BigInt(100), 'active')
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('getActiveConversation', () => {
    it('nen tra ve cuoc tro chuyen active voi PT chinh cua member', async () => {
      const mockResult = { conversation: { conversationId: '1' }, primaryTrainer: { staffId: '5' } }
      chatService.getActiveConversationForMember.mockResolvedValue(mockResult)

      const res = await controller.getActiveConversation(mockUser)

      expect(chatService.getActiveConversationForMember).toHaveBeenCalledWith(BigInt(100))
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('getMessages', () => {
    it('nen tra ve lich su tin nhan theo cursor-based pagination', async () => {
      const mockResult = { messages: [], nextCursor: null, hasMore: false }
      chatService.getMessages.mockResolvedValue(mockResult)

      const res = await controller.getMessages(1, { limit: 20, cursor: '50' }, mockUser)

      expect(chatService.getMessages).toHaveBeenCalledWith(BigInt(1), BigInt(100), {
        limit: 20,
        cursor: '50',
      })
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('sendMessage', () => {
    it('nen tao tin nhan van ban moi', async () => {
      const mockResult = { messageId: '10', content: 'Xin chao' }
      chatService.createMessage.mockResolvedValue(mockResult)

      const res = await controller.sendMessage(1, { content: 'Xin chao' }, mockUser)

      expect(chatService.createMessage).toHaveBeenCalledWith(
        BigInt(1),
        BigInt(100),
        'Xin chao',
        'text'
      )
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('uploadAttachment', () => {
    it('nen nem BadRequestException neu khong co file upload', async () => {
      await expect(controller.uploadAttachment(1, null as any, mockUser)).rejects.toThrow(
        BadRequestException
      )
    })

    it('nen upload anh va tao tin nhan image', async () => {
      const mockFile: ChatUploadedFile = {
        filename: 'test.jpg',
        originalname: 'meal.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      }
      const mockResult = { messageId: '20', messageType: 'image', attachmentUrl: '/uploads/chat/test.jpg' }
      chatService.uploadAttachmentAndCreateMessage.mockResolvedValue(mockResult)

      const res = await controller.uploadAttachment(1, mockFile, mockUser)

      expect(chatService.uploadAttachmentAndCreateMessage).toHaveBeenCalledWith(
        BigInt(1),
        BigInt(100),
        mockFile
      )
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('markRead', () => {
    it('nen danh dau da doc cuoc tro chuyen', async () => {
      const mockResult = { conversationId: '1', readAt: new Date().toISOString() }
      chatService.markAsRead.mockResolvedValue(mockResult)

      const res = await controller.markRead(1, mockUser)

      expect(chatService.markAsRead).toHaveBeenCalledWith(BigInt(1), BigInt(100))
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })

  describe('deleteMessage', () => {
    it('nen thu hoi tin nhan', async () => {
      const mockResult = { messageId: '10', conversationId: '1' }
      chatService.deleteMessage.mockResolvedValue(mockResult)

      const res = await controller.deleteMessage(10, mockUser)

      expect(chatService.deleteMessage).toHaveBeenCalledWith(BigInt(10), BigInt(100))
      expect(res).toEqual({ success: true, data: mockResult })
    })
  })
})
