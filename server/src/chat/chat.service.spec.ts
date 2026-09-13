import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ConversationStatus, MessageType } from '@prisma/client'
import * as fs from 'fs'
import { PrismaService } from '../prisma/prisma.service'
import { ChatService, ChatUploadedFile } from './chat.service'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}))

describe('ChatService', () => {
  let service: ChatService
  let prisma: {
    chatConversation: {
      findUnique: jest.Mock
      findMany: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
    chatMessage: {
      findUnique: jest.Mock
      findMany: jest.Mock
      findFirst: jest.Mock
      create: jest.Mock
      delete: jest.Mock
      count: jest.Mock
    }
    member: {
      findUnique: jest.Mock
    }
    staff: {
      findUnique: jest.Mock
    }
    file: {
      create: jest.Mock
      findUnique: jest.Mock
      delete: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    prisma = {
      chatConversation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      member: {
        findUnique: jest.fn(),
      },
      staff: {
        findUnique: jest.fn(),
      },
      file: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
  })

  describe('getOrCreateActiveConversation', () => {
    it('nen tao moi hoi thoai active neu chua ton tai', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null)
      prisma.chatConversation.create.mockResolvedValue({
        conversationId: BigInt(1),
        memberId: BigInt(10),
        trainerStaffId: BigInt(20),
        status: ConversationStatus.active,
      })

      const res = await service.getOrCreateActiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.findUnique).toHaveBeenCalledWith({
        where: {
          memberId_trainerStaffId: {
            memberId: BigInt(10),
            trainerStaffId: BigInt(20),
          },
        },
      })
      expect(prisma.chatConversation.create).toHaveBeenCalledWith({
        data: {
          memberId: BigInt(10),
          trainerStaffId: BigInt(20),
          status: ConversationStatus.active,
        },
      })
      expect(res.conversationId).toEqual(BigInt(1))
    })

    it('nen kich hoat lai hoi thoai neu da ton tai nhung o trang thai archived', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        memberId: BigInt(10),
        trainerStaffId: BigInt(20),
        status: ConversationStatus.archived,
      })
      prisma.chatConversation.update.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
      })

      const res = await service.getOrCreateActiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: { status: ConversationStatus.active },
      })
      expect(res.status).toBe(ConversationStatus.active)
    })

    it('nen tra ve hoi thoai hien tai neu da active', async () => {
      const existing = {
        conversationId: BigInt(1),
        memberId: BigInt(10),
        trainerStaffId: BigInt(20),
        status: ConversationStatus.active,
      }
      prisma.chatConversation.findUnique.mockResolvedValue(existing)

      const res = await service.getOrCreateActiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.update).not.toHaveBeenCalled()
      expect(res).toEqual(existing)
    })
  })

  describe('archiveConversation', () => {
    it('nen chuyen trang thai thanh archived neu dang active', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
      })
      prisma.chatConversation.update.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.archived,
      })

      const res = await service.archiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: { status: ConversationStatus.archived },
      })
      expect(res?.status).toBe(ConversationStatus.archived)
    })

    it('nen tra ve null va khong bao loi neu hoi thoai khong ton tai', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null)

      const res = await service.archiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.update).not.toHaveBeenCalled()
      expect(res).toBeNull()
    })

    it('nen giu nguyen neu hoi thoai da archived', async () => {
      const archivedConv = {
        conversationId: BigInt(1),
        status: ConversationStatus.archived,
      }
      prisma.chatConversation.findUnique.mockResolvedValue(archivedConv)

      const res = await service.archiveConversation(BigInt(10), BigInt(20))

      expect(prisma.chatConversation.update).not.toHaveBeenCalled()
      expect(res).toEqual(archivedConv)
    })
  })

  describe('getConversationsForUser', () => {
    it('nen tra ve mang rong neu user khong phai member cung khong phai staff', async () => {
      prisma.member.findUnique.mockResolvedValue(null)
      prisma.staff.findUnique.mockResolvedValue(null)

      const res = await service.getConversationsForUser(BigInt(999))

      expect(res).toEqual([])
      expect(prisma.chatConversation.findMany).not.toHaveBeenCalled()
    })

    it('nen tra ve danh sach hoi thoai kem unreadCount chinh xac cho Member', async () => {
      prisma.member.findUnique.mockResolvedValue({ memberId: BigInt(1), userId: BigInt(100) })
      prisma.staff.findUnique.mockResolvedValue(null)

      const mockConvs = [
        {
          conversationId: BigInt(1),
          memberId: BigInt(1),
          trainerStaffId: BigInt(2),
          status: ConversationStatus.active,
          lastMessageContent: 'Em chào anh',
          lastMessageAt: new Date('2026-09-13T10:00:00Z'),
          memberLastReadAt: new Date('2026-09-13T09:00:00Z'),
          trainerLastReadAt: null,
          createdAt: new Date('2026-09-10T10:00:00Z'),
          updatedAt: new Date('2026-09-13T10:00:00Z'),
          member: {
            memberId: BigInt(1),
            user: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
          },
          trainer: {
            staffId: BigInt(2),
            specialty: 'Gym & Cardio',
            user: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: BigInt(99) },
          },
        },
      ]

      prisma.chatConversation.findMany.mockResolvedValue(mockConvs)
      prisma.chatMessage.count.mockResolvedValue(2)

      const result = await service.getConversationsForUser(BigInt(100))

      expect(result).toHaveLength(1)
      expect(result[0].conversationId).toBe('1')
      expect(result[0].unreadCount).toBe(2)
      expect(result[0].participant.fullName).toBe('Coach B')
      expect(result[0].participant.role).toBe('trainer')
      expect(result[0].participant.avatarUrl).toBe('/api/v1/files/99')
      expect(prisma.chatMessage.count).toHaveBeenCalledWith({
        where: {
          conversationId: BigInt(1),
          senderUserId: { not: BigInt(100) },
          createdAt: {
            gt: new Date('2026-09-13T09:00:00Z'),
          },
        },
      })
    })

    it('nen loc theo statusFilter neu co truyen', async () => {
      prisma.member.findUnique.mockResolvedValue({ memberId: BigInt(1), userId: BigInt(100) })
      prisma.staff.findUnique.mockResolvedValue(null)
      prisma.chatConversation.findMany.mockResolvedValue([])

      await service.getConversationsForUser(BigInt(100), ConversationStatus.archived)

      expect(prisma.chatConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConversationStatus.archived,
          }),
        })
      )
    })

    it('nen tinh unreadCount voi Date(0) khi memberLastReadAt la null', async () => {
      prisma.member.findUnique.mockResolvedValue({ memberId: BigInt(1), userId: BigInt(100) })
      prisma.staff.findUnique.mockResolvedValue(null)

      const mockConvs = [
        {
          conversationId: BigInt(1),
          memberId: BigInt(1),
          trainerStaffId: BigInt(2),
          status: ConversationStatus.active,
          lastMessageContent: 'Tin dau tien',
          lastMessageAt: new Date('2026-09-13T10:00:00Z'),
          memberLastReadAt: null,
          trainerLastReadAt: null,
          createdAt: new Date('2026-09-10T10:00:00Z'),
          updatedAt: new Date('2026-09-13T10:00:00Z'),
          member: {
            memberId: BigInt(1),
            user: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
          },
          trainer: {
            staffId: BigInt(2),
            specialty: 'Gym',
            user: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
          },
        },
      ]

      prisma.chatConversation.findMany.mockResolvedValue(mockConvs)
      prisma.chatMessage.count.mockResolvedValue(5)

      const result = await service.getConversationsForUser(BigInt(100))

      expect(result[0].unreadCount).toBe(5)
      expect(prisma.chatMessage.count).toHaveBeenCalledWith({
        where: {
          conversationId: BigInt(1),
          senderUserId: { not: BigInt(100) },
          createdAt: {
            gt: new Date(0),
          },
        },
      })
    })
  })

  describe('getActiveConversationForMember', () => {
    it('nen nem NotFoundException neu member khong ton tai', async () => {
      prisma.member.findUnique.mockResolvedValue(null)

      await expect(service.getActiveConversationForMember(BigInt(999))).rejects.toThrow(
        NotFoundException
      )
    })

    it('nen tra ve null neu member khong co PT chinh', async () => {
      prisma.member.findUnique.mockResolvedValue({
        memberId: BigInt(1),
        primaryTrainerId: null,
        primaryTrainer: null,
      })

      const res = await service.getActiveConversationForMember(BigInt(100))

      expect(res.conversation).toBeNull()
      expect(res.primaryTrainer).toBeNull()
    })

    it('nen tra ve conversation va thong tin PT chinh khi member co primary trainer', async () => {
      prisma.member.findUnique.mockResolvedValue({
        memberId: BigInt(1),
        primaryTrainerId: BigInt(20),
        primaryTrainer: {
          staffId: BigInt(20),
          position: 'trainer',
          specialty: 'Gym',
          user: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
        },
      })
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        memberId: BigInt(1),
        trainerStaffId: BigInt(20),
        status: ConversationStatus.active,
        lastMessageContent: 'Test',
        lastMessageAt: new Date('2026-09-13T10:00:00Z'),
        memberLastReadAt: new Date('2026-09-13T09:00:00Z'),
        createdAt: new Date('2026-09-10T10:00:00Z'),
        updatedAt: new Date('2026-09-13T10:00:00Z'),
      })
      prisma.chatMessage.count.mockResolvedValue(0)

      const res = await service.getActiveConversationForMember(BigInt(100))

      expect(res.conversation?.conversationId).toBe('1')
      expect(res.primaryTrainer?.fullName).toBe('Coach B')
      expect(res.primaryTrainer?.staffId).toBe('20')
    })
  })

  describe('getMessages', () => {
    it('nen nem NotFoundException neu cuoc tro chuyen khong ton tai', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null)

      await expect(
        service.getMessages(BigInt(999), BigInt(100), { limit: 20 })
      ).rejects.toThrow(NotFoundException)
    })

    it('nen nem ForbiddenException neu user khong thuoc cuoc tro chuyen', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      await expect(
        service.getMessages(BigInt(1), BigInt(999), { limit: 20 })
      ).rejects.toThrow(ForbiddenException)
    })

    it('nen tra ve danh sach tin nhan sap xep thoi gian tang dan kem nextCursor', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockRawMessages = [
        {
          messageId: BigInt(102),
          conversationId: BigInt(1),
          senderUserId: BigInt(200),
          messageType: MessageType.text,
          content: 'Tin moi nhat',
          attachmentFileId: null,
          createdAt: new Date('2026-09-13T10:02:00Z'),
          senderUser: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
          attachmentFile: null,
        },
        {
          messageId: BigInt(101),
          conversationId: BigInt(1),
          senderUserId: BigInt(100),
          messageType: MessageType.text,
          content: 'Tin cu hon',
          attachmentFileId: null,
          createdAt: new Date('2026-09-13T10:01:00Z'),
          senderUser: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
          attachmentFile: null,
        },
      ]

      prisma.chatMessage.findMany.mockResolvedValue(mockRawMessages)

      const res = await service.getMessages(BigInt(1), BigInt(100), { limit: 2 })

      expect(res.messages).toHaveLength(2)
      expect(res.messages[0].messageId).toBe('101')
      expect(res.messages[1].messageId).toBe('102')
      expect(res.hasMore).toBe(false)
      expect(res.nextCursor).toBeNull()
    })

    it('nen xu ly hasMore va sinh nextCursor chinh xac khi so luong tin > limit', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      // Giả lập rawMessages trả về limit + 1 = 3 bản ghi
      const mockRawMessages = [
        {
          messageId: BigInt(103),
          conversationId: BigInt(1),
          senderUserId: BigInt(200),
          messageType: MessageType.text,
          content: 'Tin 3',
          createdAt: new Date('2026-09-13T10:03:00Z'),
          senderUser: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
          attachmentFile: null,
        },
        {
          messageId: BigInt(102),
          conversationId: BigInt(1),
          senderUserId: BigInt(100),
          messageType: MessageType.text,
          content: 'Tin 2',
          createdAt: new Date('2026-09-13T10:02:00Z'),
          senderUser: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
          attachmentFile: null,
        },
        {
          messageId: BigInt(101),
          conversationId: BigInt(1),
          senderUserId: BigInt(200),
          messageType: MessageType.text,
          content: 'Tin 1',
          createdAt: new Date('2026-09-13T10:01:00Z'),
          senderUser: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
          attachmentFile: null,
        },
      ]

      prisma.chatMessage.findMany.mockResolvedValue(mockRawMessages)

      const res = await service.getMessages(BigInt(1), BigInt(100), { limit: 2 })

      expect(res.messages).toHaveLength(2)
      expect(res.hasMore).toBe(true)
      expect(res.nextCursor).toBe('102')
    })

    it('nen loc voi cursor hop le khi truyen query cursor', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const cursorDate = new Date('2026-09-13T10:05:00Z')
      prisma.chatMessage.findUnique.mockResolvedValue({
        createdAt: cursorDate,
      })
      prisma.chatMessage.findMany.mockResolvedValue([])

      await service.getMessages(BigInt(1), BigInt(100), { cursor: '500', limit: 20 })

      expect(prisma.chatMessage.findUnique).toHaveBeenCalledWith({
        where: { messageId: BigInt(500) },
        select: { createdAt: true },
      })
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: BigInt(1),
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, messageId: { lt: BigInt(500) } },
            ],
          }),
        })
      )
    })

    it('nen bo qua cursor neu khong tim thay tin nhan cursor hoac cursor khong hop le', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })
      prisma.chatMessage.findUnique.mockResolvedValue(null)
      prisma.chatMessage.findMany.mockResolvedValue([])

      await service.getMessages(BigInt(1), BigInt(100), { cursor: 'invalid-id' })

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: BigInt(1) },
        })
      )
    })

    it('nen gioi han limit trong khoang 1 den 100', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })
      prisma.chatMessage.findMany.mockResolvedValue([])

      // Test limit vượt 100 -> clamped thành 100 (take = 101)
      await service.getMessages(BigInt(1), BigInt(100), { limit: 200 })
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 })
      )

      // Test limit < 1 -> clamped thành 1 (take = 2)
      await service.getMessages(BigInt(1), BigInt(100), { limit: -5 })
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 })
      )
    })
  })

  describe('createMessage', () => {
    it('nen nem NotFoundException neu cuoc tro chuyen khong ton tai', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null)

      await expect(
        service.createMessage(BigInt(999), BigInt(100), 'Hello')
      ).rejects.toThrow(NotFoundException)
    })

    it('nen nem ForbiddenException neu caller khong thuoc cuoc tro chuyen', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      await expect(
        service.createMessage(BigInt(1), BigInt(999), 'Hello')
      ).rejects.toThrow(ForbiddenException)
    })

    it('nen nem BadRequestException khi gui tin vao hoi thoai archived', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.archived,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      await expect(
        service.createMessage(BigInt(1), BigInt(100), 'Hello')
      ).rejects.toThrow(BadRequestException)
    })

    it('nen tao tin nhan text va cap nhat memberLastReadAt neu nguoi gui la Member', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockCreatedMsg = {
        messageId: BigInt(555),
        conversationId: BigInt(1),
        senderUserId: BigInt(100),
        messageType: MessageType.text,
        content: 'Hom nay tap gi?',
        createdAt: new Date(),
        senderUser: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
        attachmentFile: null,
      }

      prisma.$transaction.mockResolvedValue([mockCreatedMsg, {}])

      const res = await service.createMessage(BigInt(1), BigInt(100), 'Hom nay tap gi?')

      expect(prisma.$transaction).toHaveBeenCalled()
      expect(res.messageId).toBe('555')
      expect(res.content).toBe('Hom nay tap gi?')
      expect(res.isSender).toBe(true)
    })

    it('nen tao tin nhan va cap nhat trainerLastReadAt neu nguoi gui la Trainer', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockCreatedMsg = {
        messageId: BigInt(556),
        conversationId: BigInt(1),
        senderUserId: BigInt(200),
        messageType: MessageType.text,
        content: 'Chào em, hôm nay tập chân nhé',
        createdAt: new Date(),
        senderUser: { userId: BigInt(200), fullName: 'Coach B', avatarFileId: null },
        attachmentFile: null,
      }

      prisma.$transaction.mockResolvedValue([mockCreatedMsg, {}])

      const res = await service.createMessage(BigInt(1), BigInt(200), 'Chào em, hôm nay tập chân nhé')

      expect(prisma.$transaction).toHaveBeenCalled()
      expect(res.messageId).toBe('556')
      expect(res.senderName).toBe('Coach B')
    })

    it('nen preview [Hình ảnh] trong lastMessageContent khi gui tin nhan dang image', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockCreatedMsg = {
        messageId: BigInt(557),
        conversationId: BigInt(1),
        senderUserId: BigInt(100),
        messageType: MessageType.image,
        content: 'meal.jpg',
        createdAt: new Date(),
        senderUser: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
        attachmentFile: { fileId: BigInt(12), storagePath: 'uploads/chat/meal.jpg', publicUrl: null },
      }

      prisma.$transaction.mockResolvedValue([mockCreatedMsg, {}])

      const res = await service.createMessage(
        BigInt(1),
        BigInt(100),
        'meal.jpg',
        MessageType.image,
        BigInt(12)
      )

      expect(res.messageType).toBe(MessageType.image)
      expect(res.attachmentUrl).toBe('/uploads/chat/meal.jpg')
    })
  })

  describe('deleteMessage', () => {
    it('nen nem NotFoundException neu tin nhan khong ton tai', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue(null)

      await expect(
        service.deleteMessage(BigInt(999), BigInt(100))
      ).rejects.toThrow(NotFoundException)
    })

    it('nen nem ForbiddenException neu nguoi goi khong phai nguoi gui', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        messageId: BigInt(555),
        senderUserId: BigInt(200),
        conversationId: BigInt(1),
      })

      await expect(
        service.deleteMessage(BigInt(555), BigInt(100))
      ).rejects.toThrow(ForbiddenException)
    })

    it('nen hard delete tin nhan va cap nhat lai lastMessage cua hoi thoai', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        messageId: BigInt(555),
        senderUserId: BigInt(100),
        conversationId: BigInt(1),
      })
      prisma.chatMessage.delete.mockResolvedValue({})
      prisma.chatMessage.findFirst.mockResolvedValue({
        messageId: BigInt(554),
        messageType: MessageType.text,
        content: 'Tin truoc do',
        createdAt: new Date('2026-09-13T09:59:00Z'),
      })
      prisma.chatConversation.update.mockResolvedValue({})

      const res = await service.deleteMessage(BigInt(555), BigInt(100))

      expect(prisma.chatMessage.delete).toHaveBeenCalledWith({
        where: { messageId: BigInt(555) },
      })
      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: {
          lastMessageContent: 'Tin truoc do',
          lastMessageAt: expect.any(Date),
        },
      })
      expect(res.messageId).toBe('555')
      expect(res.conversationId).toBe('1')
    })

    it('nen cap nhat lastMessageContent ve null neu khong con tin nhan nao sau khi xoa', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        messageId: BigInt(555),
        senderUserId: BigInt(100),
        conversationId: BigInt(1),
      })
      prisma.chatMessage.delete.mockResolvedValue({})
      prisma.chatMessage.findFirst.mockResolvedValue(null)
      prisma.chatConversation.update.mockResolvedValue({})

      const res = await service.deleteMessage(BigInt(555), BigInt(100))

      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: {
          lastMessageContent: null,
          lastMessageAt: null,
        },
      })
      expect(res.messageId).toBe('555')
    })

    it('nen don dep ban ghi file khi thu hoi tin nhan co hinh anh', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true)

      prisma.chatMessage.findUnique.mockResolvedValue({
        messageId: BigInt(777),
        senderUserId: BigInt(100),
        conversationId: BigInt(1),
        attachmentFileId: BigInt(999),
      })
      prisma.chatMessage.delete.mockResolvedValue({})
      prisma.file.findUnique.mockResolvedValue({
        fileId: BigInt(999),
        storagePath: 'uploads/chat/test.png',
      })
      prisma.file.delete.mockResolvedValue({})
      prisma.chatMessage.findFirst.mockResolvedValue(null)
      prisma.chatConversation.update.mockResolvedValue({})

      const res = await service.deleteMessage(BigInt(777), BigInt(100))

      expect(prisma.chatMessage.delete).toHaveBeenCalledWith({
        where: { messageId: BigInt(777) },
      })
      expect(prisma.file.findUnique).toHaveBeenCalledWith({
        where: { fileId: BigInt(999) },
      })
      expect(prisma.file.delete).toHaveBeenCalledWith({
        where: { fileId: BigInt(999) },
      })
      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(res.messageId).toBe('777')
    })
  })

  describe('markAsRead', () => {
    it('nen nem NotFoundException neu cuoc tro chuyen khong ton tai', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null)

      await expect(service.markAsRead(BigInt(999), BigInt(100))).rejects.toThrow(
        NotFoundException
      )
    })

    it('nen nem ForbiddenException neu caller khong thuoc cuoc tro chuyen', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      await expect(service.markAsRead(BigInt(1), BigInt(999))).rejects.toThrow(
        ForbiddenException
      )
    })

    it('nen cap nhat memberLastReadAt neu caller la Member', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })
      prisma.chatConversation.update.mockResolvedValue({})

      const res = await service.markAsRead(BigInt(1), BigInt(100))

      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: { memberLastReadAt: expect.any(Date) },
      })
      expect(res.conversationId).toBe('1')
    })

    it('nen cap nhat trainerLastReadAt neu caller la Trainer', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })
      prisma.chatConversation.update.mockResolvedValue({})

      const res = await service.markAsRead(BigInt(1), BigInt(200))

      expect(prisma.chatConversation.update).toHaveBeenCalledWith({
        where: { conversationId: BigInt(1) },
        data: { trainerLastReadAt: expect.any(Date) },
      })
      expect(res.conversationId).toBe('1')
    })
  })

  describe('uploadAttachmentAndCreateMessage', () => {
    it('nen nem BadRequestException neu file bi null hoac thieu', async () => {
      await expect(
        service.uploadAttachmentAndCreateMessage(BigInt(1), BigInt(100), null as any)
      ).rejects.toThrow(BadRequestException)
    })

    it('nen nem BadRequestException neu mimeType khong hop le', async () => {
      const invalidFile: ChatUploadedFile = {
        filename: 'hack.exe',
        originalname: 'hack.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
      }

      await expect(
        service.uploadAttachmentAndCreateMessage(BigInt(1), BigInt(100), invalidFile)
      ).rejects.toThrow(BadRequestException)
    })

    it('nen nem BadRequestException neu file vuot qua 5MB hoac rong', async () => {
      const tooLargeFile: ChatUploadedFile = {
        filename: 'huge.png',
        originalname: 'huge.png',
        mimetype: 'image/png',
        size: 6 * 1024 * 1024,
      }

      await expect(
        service.uploadAttachmentAndCreateMessage(BigInt(1), BigInt(100), tooLargeFile)
      ).rejects.toThrow(BadRequestException)

      const emptyFile: ChatUploadedFile = {
        filename: 'empty.png',
        originalname: 'empty.png',
        mimetype: 'image/png',
        size: 0,
      }

      await expect(
        service.uploadAttachmentAndCreateMessage(BigInt(1), BigInt(100), emptyFile)
      ).rejects.toThrow(BadRequestException)
    })

    it('nen tao ban ghi file va tao tin nhan image khi file hop le', async () => {
      prisma.file.create.mockResolvedValue({
        fileId: BigInt(999),
        storagePath: 'uploads/chat/img.png',
        publicUrl: '/uploads/chat/img.png',
      })

      prisma.chatConversation.findUnique.mockResolvedValue({
        conversationId: BigInt(1),
        status: ConversationStatus.active,
        member: { userId: BigInt(100) },
        trainer: { userId: BigInt(200) },
      })

      const mockMsg = {
        messageId: BigInt(888),
        conversationId: BigInt(1),
        senderUserId: BigInt(100),
        messageType: MessageType.image,
        content: 'meal.png',
        createdAt: new Date(),
        senderUser: { userId: BigInt(100), fullName: 'Nguyen Van A', avatarFileId: null },
        attachmentFile: { fileId: BigInt(999), publicUrl: '/uploads/chat/img.png' },
      }

      prisma.$transaction.mockResolvedValue([mockMsg, {}])

      const res = await service.uploadAttachmentAndCreateMessage(BigInt(1), BigInt(100), {
        filename: 'img.png',
        originalname: 'meal.png',
        mimetype: 'image/png',
        size: 1024,
      })

      expect(prisma.file.create).toHaveBeenCalledWith({
        data: {
          ownerUserId: BigInt(100),
          fileType: 'chat_attachment',
          storagePath: 'uploads/chat/img.png',
          publicUrl: '/uploads/chat/img.png',
          mimeType: 'image/png',
          sizeBytes: BigInt(1024),
        },
      })
      expect(res.messageId).toBe('888')
      expect(res.messageType).toBe(MessageType.image)
      expect(res.attachmentUrl).toBe('/uploads/chat/img.png')
    })
  })
})
