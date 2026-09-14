import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConversationStatus, MessageType, Prisma } from '@prisma/client'
import * as fs from 'fs'
import { join } from 'path'
import { PrismaService } from '../prisma/prisma.service'
import {
  ChatMessageResponseDto,
  ConversationSummaryDto,
  MessagesListResponseDto,
  QueryMessagesDto,
} from './dto'

export interface ChatUploadedFile {
  filename: string
  originalname: string
  mimetype: string
  size: number
  path?: string
}

export type MemberChatEligibility =
  | 'NO_ACTIVE_SUBSCRIPTION'
  | 'NO_PT_PACKAGE'
  | 'PT_NOT_SELECTED'
  | 'READY'

export interface ActiveMemberConversationResponse {
  eligibility: MemberChatEligibility
  conversation: ConversationSummaryDto | null
  primaryTrainer: {
    staffId: string
    userId: string
    fullName: string
    avatarUrl: string | null
    position?: string | null
    specialty?: string | null
  } | null
}

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm hoặc tạo mới cuộc trò chuyện giữa Member và PT chính.
   * Nếu đã tồn tại nhưng ở trạng thái archived thì kích hoạt lại thành active.
   */
  async getOrCreateActiveConversation(memberId: bigint, trainerStaffId: bigint) {
    const existing = await this.prisma.chatConversation.findUnique({
      where: {
        memberId_trainerStaffId: {
          memberId,
          trainerStaffId,
        },
      },
    })

    if (existing) {
      if (existing.status !== ConversationStatus.active) {
        return this.prisma.chatConversation.update({
          where: { conversationId: existing.conversationId },
          data: { status: ConversationStatus.active },
        })
      }
      return existing
    }

    return this.prisma.chatConversation.create({
      data: {
        memberId,
        trainerStaffId,
        status: ConversationStatus.active,
      },
    })
  }

  /**
   * Lưu trữ cuộc trò chuyện (chuyển sang archived) khi đổi hoặc huỷ PT.
   */
  async archiveConversation(memberId: bigint, trainerStaffId: bigint) {
    const existing = await this.prisma.chatConversation.findUnique({
      where: {
        memberId_trainerStaffId: {
          memberId,
          trainerStaffId,
        },
      },
    })

    if (existing && existing.status === ConversationStatus.active) {
      return this.prisma.chatConversation.update({
        where: { conversationId: existing.conversationId },
        data: { status: ConversationStatus.archived },
      })
    }
    return existing ?? null
  }

  /**
   * Lấy danh sách tất cả các cuộc trò chuyện của một User (Member hoặc Trainer).
   * Kèm thông tin đối tác trò chuyện, tin nhắn cuối và số tin chưa đọc (unreadCount).
   */
  async getConversationsForUser(
    userId: bigint,
    statusFilter?: ConversationStatus
  ): Promise<ConversationSummaryDto[]> {
    // 1. Tìm bản ghi Member hoặc Staff gắn với userId
    const [member, staff] = await Promise.all([
      this.prisma.member.findUnique({ where: { userId } }),
      this.prisma.staff.findUnique({ where: { userId } }),
    ])

    if (!member && !staff) {
      return []
    }

    // Nếu là Trainer (staff): Đảm bảo tất cả các học viên đang được phân công cho PT này đều có cuộc trò chuyện active
    if (staff) {
      const assignedMembers = await this.prisma.member.findMany({
        where: {
          primaryTrainerId: staff.staffId,
          deletedAt: null,
          user: {
            deletedAt: null,
            status: 'active',
          },
        },
        select: { memberId: true },
      })

      await Promise.all(
        assignedMembers.map((m) =>
          this.getOrCreateActiveConversation(m.memberId, staff.staffId)
        )
      )
    }

    const whereConditions: Prisma.ChatConversationWhereInput[] = []
    if (member) {
      whereConditions.push({ memberId: member.memberId })
    }
    if (staff) {
      whereConditions.push({ trainerStaffId: staff.staffId })
    }

    const where: Prisma.ChatConversationWhereInput = {
      OR: whereConditions,
      ...(statusFilter ? { status: statusFilter } : {}),
    }

    const conversations = await this.prisma.chatConversation.findMany({
      where,
      include: {
        member: {
          include: {
            user: {
              select: {
                userId: true,
                fullName: true,
                avatarFileId: true,
              },
            },
          },
        },
        trainer: {
          include: {
            user: {
              select: {
                userId: true,
                fullName: true,
                avatarFileId: true,
              },
            },
          },
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    })

    // 2. Tính toán unreadCount song song và format DTO cho từng cuộc trò chuyện
    const results = await Promise.all(
      conversations.map(async (conv) => {
        const isMember = member && conv.memberId === member.memberId
        const lastReadAt = isMember ? conv.memberLastReadAt : conv.trainerLastReadAt

        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conv.conversationId,
            senderUserId: { not: userId },
            createdAt: {
              gt: lastReadAt ?? new Date(0),
            },
          },
        })

        const participantUser = isMember ? conv.trainer.user : conv.member.user
        const participantRole = isMember ? ('trainer' as const) : ('member' as const)

        return {
          conversationId: conv.conversationId.toString(),
          status: conv.status,
          participant: {
            userId: participantUser.userId.toString(),
            fullName: participantUser.fullName,
            avatarUrl: participantUser.avatarFileId ? `/api/v1/files/${participantUser.avatarFileId}` : null,
            role: participantRole,
            memberId: isMember ? undefined : conv.member.memberId.toString(),
            memberCode: isMember ? undefined : conv.member.memberCode,
            staffId: isMember ? conv.trainer.staffId.toString() : undefined,
            specialty: isMember ? conv.trainer.specialty : undefined,
          },
          lastMessageContent: conv.lastMessageContent,
          lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
          unreadCount,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        }
      })
    )

    // 3. Sắp xếp kết quả: Ưu tiên cuộc trò chuyện có tin nhắn mới nhất, các học viên chưa nhắn tin xếp sau theo createdAt mới nhất
    results.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      }
      if (a.lastMessageAt && !b.lastMessageAt) return -1
      if (!a.lastMessageAt && b.lastMessageAt) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return results
  }

  /**
   * Lấy cuộc trò chuyện active hiện tại của Member với Huấn luyện viên chính.
   * Phân loại điều kiện theo Subscription (4 trạng thái).
   */
  async getActiveConversationForMember(
    userId: bigint
  ): Promise<ActiveMemberConversationResponse> {
    const member = await this.prisma.member.findUnique({
      where: { userId },
      include: {
        primaryTrainer: {
          include: {
            user: {
              select: {
                userId: true,
                fullName: true,
                avatarFileId: true,
              },
            },
          },
        },
      },
    })

    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Hội viên không tồn tại',
      })
    }

    // 1. Kiểm tra Subscription đang hoạt động
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        memberId: member.memberId,
        status: 'active',
        deletedAt: null,
        endDate: { gte: todayVN() },
      },
      include: { package: true },
      orderBy: { endDate: 'desc' },
    })

    if (!activeSubscription) {
      return {
        eligibility: 'NO_ACTIVE_SUBSCRIPTION',
        conversation: null,
        primaryTrainer: null,
      }
    }

    // 2. Kiểm tra gói tập có bao gồm PT hay không
    if (!activeSubscription.package?.includesPt) {
      return {
        eligibility: 'NO_PT_PACKAGE',
        conversation: null,
        primaryTrainer: null,
      }
    }

    // 3. Kiểm tra đã chọn PT chính hay chưa
    if (!member.primaryTrainerId || !member.primaryTrainer) {
      return {
        eligibility: 'PT_NOT_SELECTED',
        conversation: null,
        primaryTrainer: null,
      }
    }

    // 4. Đủ điều kiện (READY): Tự động khởi tạo / kích hoạt cuộc trò chuyện active
    const conversation = await this.getOrCreateActiveConversation(
      member.memberId,
      member.primaryTrainerId
    )

    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        conversationId: conversation.conversationId,
        senderUserId: { not: userId },
        createdAt: {
          gt: conversation.memberLastReadAt ?? new Date(0),
        },
      },
    })

    const trainerParticipant = {
      userId: member.primaryTrainer.user.userId.toString(),
      fullName: member.primaryTrainer.user.fullName,
      avatarUrl: member.primaryTrainer.user.avatarFileId
        ? `/api/v1/files/${member.primaryTrainer.user.avatarFileId}`
        : null,
      role: 'trainer' as const,
      staffId: member.primaryTrainer.staffId.toString(),
      specialty: member.primaryTrainer.specialty,
    }

    return {
      eligibility: 'READY',
      conversation: {
        conversationId: conversation.conversationId.toString(),
        status: conversation.status,
        participant: trainerParticipant,
        lastMessageContent: conversation.lastMessageContent,
        lastMessageAt: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
        unreadCount,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      primaryTrainer: {
        staffId: member.primaryTrainer.staffId.toString(),
        userId: member.primaryTrainer.user.userId.toString(),
        fullName: member.primaryTrainer.user.fullName,
        avatarUrl: member.primaryTrainer.user.avatarFileId
          ? `/api/v1/files/${member.primaryTrainer.user.avatarFileId}`
          : null,
        position: member.primaryTrainer.position,
        specialty: member.primaryTrainer.specialty,
      },
    }
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện hỗ trợ phân trang Cursor-based.
   */
  async getMessages(
    conversationId: bigint,
    userId: bigint,
    query: QueryMessagesDto
  ): Promise<MessagesListResponseDto> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { conversationId },
      include: {
        member: true,
        trainer: true,
      },
    })

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Cuộc trò chuyện không tồn tại',
      })
    }

    // Bảo mật: Kiểm tra xem user có thuộc cuộc trò chuyện này không
    if (conversation.member.userId !== userId && conversation.trainer.userId !== userId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập cuộc trò chuyện này',
      })
    }

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100)
    let cursorFilter: Prisma.ChatMessageWhereInput = {}

    if (query.cursor) {
      try {
        const cursorMsgId = BigInt(query.cursor)
        const cursorMsg = await this.prisma.chatMessage.findUnique({
          where: { messageId: cursorMsgId },
          select: { createdAt: true },
        })
        if (cursorMsg) {
          cursorFilter = {
            OR: [
              { createdAt: { lt: cursorMsg.createdAt } },
              { createdAt: cursorMsg.createdAt, messageId: { lt: cursorMsgId } },
            ],
          }
        }
      } catch {
        // Nếu cursor không hợp lệ thì bỏ qua
      }
    }

    // Lấy dư 1 bản ghi để xác định hasMore
    const rawMessages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...cursorFilter,
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { messageId: 'desc' }],
      include: {
        senderUser: {
          select: {
            userId: true,
            fullName: true,
            avatarFileId: true,
          },
        },
        attachmentFile: {
          select: {
            fileId: true,
            publicUrl: true,
            storagePath: true,
          },
        },
      },
    })

    const hasMore = rawMessages.length > limit
    const messagesToReturn = hasMore ? rawMessages.slice(0, limit) : rawMessages

    // Cursor cho trang tin nhắn cũ hơn tiếp theo là messageId của tin cũ nhất trong trang này
    const nextCursor =
      hasMore && messagesToReturn.length > 0
        ? messagesToReturn[messagesToReturn.length - 1].messageId.toString()
        : null

    // Đảo ngược mảng để client nhận theo thứ tự thời gian tăng dần (asc)
    const formattedMessages: ChatMessageResponseDto[] = [...messagesToReturn]
      .reverse()
      .map((msg) => {
        let attachmentUrl = msg.attachmentFile?.publicUrl ?? null
        if (!attachmentUrl && msg.attachmentFile?.storagePath) {
          attachmentUrl = msg.attachmentFile.storagePath.startsWith('/')
            ? msg.attachmentFile.storagePath
            : `/${msg.attachmentFile.storagePath}`
        }

        return {
          messageId: msg.messageId.toString(),
          conversationId: msg.conversationId.toString(),
          senderUserId: msg.senderUserId.toString(),
          senderName: msg.senderUser.fullName,
          senderAvatarUrl: msg.senderUser.avatarFileId
            ? `/api/v1/files/${msg.senderUser.avatarFileId}`
            : null,
          isSender: msg.senderUserId === userId,
          messageType: msg.messageType,
          content: msg.content,
          attachmentUrl,
          createdAt: msg.createdAt.toISOString(),
        }
      })

    return {
      messages: formattedMessages,
      nextCursor,
      hasMore,
    }
  }

  /**
   * Tạo tin nhắn mới (Text hoặc Image) và cập nhật tin nhắn cuối cùng của hội thoại.
   */
  async createMessage(
    conversationId: bigint,
    senderUserId: bigint,
    content: string,
    messageType: MessageType = MessageType.text,
    attachmentFileId?: bigint
  ): Promise<ChatMessageResponseDto> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { conversationId },
      include: {
        member: true,
        trainer: true,
      },
    })

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Cuộc trò chuyện không tồn tại',
      })
    }

    if (conversation.member.userId !== senderUserId && conversation.trainer.userId !== senderUserId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này',
      })
    }

    if (conversation.status === ConversationStatus.archived) {
      throw new BadRequestException({
        success: false,
        code: 'CONVERSATION_ARCHIVED',
        message: 'Cuộc trò chuyện đã lưu trữ, không thể gửi tin nhắn mới',
      })
    }

    const isMemberSender = conversation.member.userId === senderUserId
    const now = new Date()
    const lastPreview = messageType === MessageType.image ? '[Hình ảnh]' : content.slice(0, 500)

    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          conversationId,
          senderUserId,
          messageType,
          content,
          attachmentFileId: attachmentFileId ?? null,
          createdAt: now,
        },
        include: {
          senderUser: {
            select: {
              userId: true,
              fullName: true,
              avatarFileId: true,
            },
          },
          attachmentFile: {
            select: {
              fileId: true,
              publicUrl: true,
              storagePath: true,
            },
          },
        },
      }),
      this.prisma.chatConversation.update({
        where: { conversationId },
        data: {
          lastMessageContent: lastPreview,
          lastMessageAt: now,
          ...(isMemberSender ? { memberLastReadAt: now } : { trainerLastReadAt: now }),
        },
      }),
    ])

    let attachmentUrl = message.attachmentFile?.publicUrl ?? null
    if (!attachmentUrl && message.attachmentFile?.storagePath) {
      attachmentUrl = message.attachmentFile.storagePath.startsWith('/')
        ? message.attachmentFile.storagePath
        : `/${message.attachmentFile.storagePath}`
    }

    return {
      messageId: message.messageId.toString(),
      conversationId: message.conversationId.toString(),
      senderUserId: message.senderUserId.toString(),
      senderName: message.senderUser.fullName,
      senderAvatarUrl: message.senderUser.avatarFileId
        ? `/api/v1/files/${message.senderUser.avatarFileId}`
        : null,
      isSender: true,
      messageType: message.messageType,
      content: message.content,
      attachmentUrl,
      createdAt: message.createdAt.toISOString(),
    }
  }

  /**
   * Thu hồi tin nhắn (Hard delete) - chỉ người gửi mới có quyền.
   */
  async deleteMessage(messageId: bigint, senderUserId: bigint) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { messageId },
    })

    if (!message) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Tin nhắn không tồn tại',
      })
    }

    if (message.senderUserId !== senderUserId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ người gửi mới có quyền thu hồi tin nhắn này',
      })
    }

    const conversationId = message.conversationId
    const attachmentFileId = message.attachmentFileId

    // 1. Xóa tin nhắn khỏi DB
    await this.prisma.chatMessage.delete({
      where: { messageId },
    })

    // 2. Nếu tin nhắn có đính kèm file, dọn dẹp bản ghi File và file vật lý trên đĩa
    if (attachmentFileId) {
      try {
        const fileRecord = await this.prisma.file.findUnique({
          where: { fileId: attachmentFileId },
        })
        if (fileRecord) {
          await this.prisma.file.delete({
            where: { fileId: attachmentFileId },
          })
          if (fileRecord.storagePath) {
            const diskPath = join(process.cwd(), fileRecord.storagePath)
            if (fs.existsSync(diskPath)) {
              fs.unlinkSync(diskPath)
            }
          }
        }
      } catch {
        // Log hoặc bỏ qua nếu file đã bị xóa trước đó
      }
    }

    // 3. Cập nhật lại lastMessageContent của conversation nếu tin bị xóa là tin mới nhất
    const latestRemainingMessage = await this.prisma.chatMessage.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    })

    if (latestRemainingMessage) {
      const preview =
        latestRemainingMessage.messageType === MessageType.image
          ? '[Hình ảnh]'
          : latestRemainingMessage.content.slice(0, 500)

      await this.prisma.chatConversation.update({
        where: { conversationId },
        data: {
          lastMessageContent: preview,
          lastMessageAt: latestRemainingMessage.createdAt,
        },
      })
    } else {
      await this.prisma.chatConversation.update({
        where: { conversationId },
        data: {
          lastMessageContent: null,
          lastMessageAt: null,
        },
      })
    }

    return {
      messageId: messageId.toString(),
      conversationId: conversationId.toString(),
    }
  }

  /**
   * Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện.
   */
  async markAsRead(conversationId: bigint, userId: bigint) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { conversationId },
      include: {
        member: true,
        trainer: true,
      },
    })

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Cuộc trò chuyện không tồn tại',
      })
    }

    const isMember = conversation.member.userId === userId
    const isTrainer = conversation.trainer.userId === userId

    if (!isMember && !isTrainer) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập cuộc trò chuyện này',
      })
    }

    const now = new Date()

    await this.prisma.chatConversation.update({
      where: { conversationId },
      data: isMember ? { memberLastReadAt: now } : { trainerLastReadAt: now },
    })

    return {
      conversationId: conversationId.toString(),
      readAt: now.toISOString(),
    }
  }

  /**
   * Upload file hình ảnh, tạo bản ghi File (chat_attachment) và tạo ChatMessage dạng image.
   */
  async uploadAttachmentAndCreateMessage(
    conversationId: bigint,
    userId: bigint,
    file: ChatUploadedFile
  ): Promise<ChatMessageResponseDto> {
    if (!file) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_FILE',
        message: 'Tệp đính kèm không hợp lệ hoặc bị thiếu',
      })
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_FILE_TYPE',
        message: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, GIF',
      })
    }

    const maxSizeBytes = 5 * 1024 * 1024 // 5MB
    if (file.size <= 0 || file.size > maxSizeBytes) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_FILE_SIZE',
        message: 'Kích thước tệp không hợp lệ (tối đa 5MB và không được rỗng)',
      })
    }

    const storagePath = `uploads/chat/${file.filename}`
    const publicUrl = `/uploads/chat/${file.filename}`

    // 1. Tạo bản ghi File trong DB
    const createdFile = await this.prisma.file.create({
      data: {
        ownerUserId: userId,
        fileType: 'chat_attachment',
        storagePath,
        publicUrl,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
      },
    })

    // 2. Tạo tin nhắn chat với attachmentFileId
    return this.createMessage(
      conversationId,
      userId,
      file.originalname,
      MessageType.image,
      createdFile.fileId
    )
  }
}
