import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { FeedbackStatus, Prisma, SubscriptionStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { ChatService } from '../chat/chat.service'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class TrainerAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly chatService: ChatService
  ) {}

  async assignTrainer(memberId: bigint, trainerId: number | null | undefined, actorUserId: bigint) {
    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Hoi vien khong ton tai',
      })

    let trainer: Prisma.StaffGetPayload<{ include: { user: true } }> | null = null
    if (trainerId != null) {
      trainer = await this.prisma.staff.findFirst({
        where: {
          staffId: BigInt(trainerId),
          deletedAt: null,
          OR: [{ position: 'trainer' }, { position: 'pt' }],
        },
        include: { user: true },
      })
      if (!trainer)
        throw new BadRequestException({
          success: false,
          code: 'FK_CONSTRAINT',
          message: 'PT khong ton tai',
        })
    }

    const oldTrainerId = member.primaryTrainerId
    const newTrainerId = trainerId != null ? BigInt(trainerId) : null

    const updated = await this.prisma.member.update({
      where: { memberId },
      data: { primaryTrainerId: newTrainerId },
    })

    // Đồng bộ vòng đời hội thoại Chat
    if (oldTrainerId && oldTrainerId !== newTrainerId) {
      await this.chatService.archiveConversation(memberId, oldTrainerId)
    }
    if (newTrainerId) {
      await this.chatService.getOrCreateActiveConversation(memberId, newTrainerId)
    }

    this.audit.log({
      actorUserId,
      action: 'member.assign-trainer',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: {
        primaryTrainerId: member.primaryTrainerId?.toString() ?? null,
      } as unknown as Record<string, unknown>,
      afterData: {
        primaryTrainerId: updated.primaryTrainerId?.toString() ?? null,
      } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        memberId: memberId.toString(),
        primaryTrainerId: updated.primaryTrainerId?.toString() ?? null,
        primaryTrainerName: trainer?.user.fullName ?? null,
      },
    }
  }

  async getAvailableTrainers() {
    const trainers = await this.prisma.staff.findMany({
      where: { deletedAt: null, OR: [{ position: 'trainer' }, { position: 'pt' }] },
      include: { user: { select: { fullName: true, avatarFileId: true } } },
      orderBy: { staffCode: 'asc' },
    })

    const staffIds = trainers.map((t) => t.staffId)
    const feedbacks = staffIds.length > 0
      ? await this.prisma.feedback.findMany({
          where: {
            subjectStaffId: { in: staffIds },
            feedbackType: 'staff',
            deletedAt: null,
            status: { not: FeedbackStatus.rejected },
          },
          select: {
            subjectStaffId: true,
            rating: true,
            tags: true,
          },
        })
      : []

    const feedbackByStaff = new Map<string, Array<{ rating: number; tags: string[] }>>()
    for (const f of feedbacks) {
      if (!f.subjectStaffId) continue
      const key = f.subjectStaffId.toString()
      const list = feedbackByStaff.get(key) ?? []
      list.push({ rating: f.rating, tags: f.tags })
      feedbackByStaff.set(key, list)
    }

    return {
      data: trainers.map((t) => {
        const staffFeedback = feedbackByStaff.get(t.staffId.toString()) ?? []
        const totalReviews = staffFeedback.length
        let ratingAverage: number | null = null
        let topTags: string[] = []

        if (totalReviews > 0) {
          const sum = staffFeedback.reduce((acc, cur) => acc + cur.rating, 0)
          ratingAverage = Math.round((sum / totalReviews) * 10) / 10

          const tagCount = new Map<string, number>()
          for (const item of staffFeedback) {
            for (const tag of item.tags) {
              const trimmed = tag.trim()
              if (trimmed) {
                tagCount.set(trimmed, (tagCount.get(trimmed) ?? 0) + 1)
              }
            }
          }
          topTags = Array.from(tagCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag)
        }

        return {
          staffId: t.staffId.toString(),
          staffCode: t.staffCode,
          fullName: t.user.fullName,
          position: t.position,
          avatarFileId: t.user.avatarFileId?.toString() ?? null,
          specialty: t.specialty ?? null,
          experienceYears: t.experienceYears ?? null,
          bio: t.bio ?? null,
          ratingAverage,
          totalReviews,
          topTags,
        }
      }),
    }
  }

  async getTrainerReviews(
    staffId: bigint,
    query?: { page?: number; pageSize?: number; rating?: number; sort?: string }
  ) {
    const trainer = await this.prisma.staff.findFirst({
      where: { staffId, deletedAt: null, OR: [{ position: 'trainer' }, { position: 'pt' }] },
      include: { user: { select: { fullName: true, avatarFileId: true } } },
    })
    if (!trainer) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Huấn luyện viên không tồn tại',
      })
    }

    // Lấy tất cả feedback hợp lệ để thống kê tổng thể
    const allFeedbacks = await this.prisma.feedback.findMany({
      where: {
        subjectStaffId: staffId,
        feedbackType: 'staff',
        deletedAt: null,
        status: { not: FeedbackStatus.rejected },
      },
      select: {
        rating: true,
        tags: true,
      },
    })

    const totalReviews = allFeedbacks.length
    const ratingCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    const tagCount = new Map<string, number>()
    let totalSum = 0

    for (const fb of allFeedbacks) {
      totalSum += fb.rating
      const rKey = fb.rating.toString()
      if (ratingCounts[rKey] !== undefined) {
        ratingCounts[rKey] += 1
      }
      for (const t of fb.tags) {
        const trimmed = t.trim()
        if (trimmed) {
          tagCount.set(trimmed, (tagCount.get(trimmed) ?? 0) + 1)
        }
      }
    }

    const ratingAverage = totalReviews > 0 ? Math.round((totalSum / totalReviews) * 10) / 10 : null
    const topTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)

    // Điều kiện lọc danh sách review
    const where: Prisma.FeedbackWhereInput = {
      subjectStaffId: staffId,
      feedbackType: 'staff',
      deletedAt: null,
      status: { not: FeedbackStatus.rejected },
    }
    if (query?.rating && query.rating >= 1 && query.rating <= 5) {
      where.rating = Number(query.rating)
    }

    let orderBy: Prisma.FeedbackOrderByWithRelationInput = { createdAt: 'desc' }
    if (query?.sort === 'highest') {
      orderBy = { rating: 'desc' }
    } else if (query?.sort === 'lowest') {
      orderBy = { rating: 'asc' }
    }

    const page = Math.max(1, Number(query?.page) || 1)
    const pageSize = Math.max(1, Math.min(50, Number(query?.pageSize) || 5))
    const skip = (page - 1) * pageSize

    const [filteredCount, reviews] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          member: {
            include: {
              user: { select: { fullName: true, avatarFileId: true } },
            },
          },
        },
      }),
    ])

    const sanitizedReviews = reviews.map((r) => ({
      feedbackId: r.feedbackId.toString(),
      rating: r.rating,
      content: r.content,
      tags: r.tags,
      isAnonymous: r.isAnonymous,
      reviewerName: r.isAnonymous ? null : (r.member?.user?.fullName ?? null),
      reviewerAvatarFileId: r.isAnonymous ? null : (r.member?.user?.avatarFileId?.toString() ?? null),
      createdAt: r.createdAt.toISOString(),
    }))

    return {
      data: {
        trainer: {
          staffId: trainer.staffId.toString(),
          staffCode: trainer.staffCode,
          fullName: trainer.user.fullName,
          position: trainer.position,
          avatarFileId: trainer.user.avatarFileId?.toString() ?? null,
          specialty: trainer.specialty,
          experienceYears: trainer.experienceYears,
          bio: trainer.bio,
        },
        stats: {
          ratingAverage,
          totalReviews,
          ratingCounts,
          topTags,
        },
        pagination: {
          page,
          pageSize,
          totalReviews: filteredCount,
          totalPages: Math.ceil(filteredCount / pageSize),
          hasMore: skip + reviews.length < filteredCount,
        },
        reviews: sanitizedReviews,
      },
    }
  }

  async selfAssignTrainer(actorUserId: bigint, trainerId: number | null) {
    const member = await this.prisma.member.findFirst({
      where: { userId: actorUserId, deletedAt: null },
      include: {
        subscriptions: {
          where: {
            deletedAt: null,
            status: SubscriptionStatus.active,
            endDate: { gte: todayVN() },
          },
          include: { package: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    })
    if (!member)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Hoi vien khong ton tai',
      })

    if (trainerId != null) {
      const activeSub = member.subscriptions[0]
      if (!activeSub?.package.includesPt) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Goi tap hien tai khong bao gom PT',
        })
      }
      const trainer = await this.prisma.staff.findFirst({
        where: {
          staffId: BigInt(trainerId),
          deletedAt: null,
          OR: [{ position: 'trainer' }, { position: 'pt' }],
        },
        include: { user: { select: { fullName: true } } },
      })
      if (!trainer)
        throw new BadRequestException({
          success: false,
          code: 'FK_CONSTRAINT',
          message: 'PT khong ton tai',
        })

      const oldTrainerId = member.primaryTrainerId
      const newTrainerId = BigInt(trainerId)

      await this.prisma.member.update({
        where: { memberId: member.memberId },
        data: { primaryTrainerId: newTrainerId },
      })

      // Đồng bộ vòng đời hội thoại Chat
      if (oldTrainerId && oldTrainerId !== newTrainerId) {
        await this.chatService.archiveConversation(member.memberId, oldTrainerId)
      }
      await this.chatService.getOrCreateActiveConversation(member.memberId, newTrainerId)

      return {
        data: { primaryTrainerId: trainerId.toString(), trainerName: trainer.user.fullName },
      }
    }

    const oldTrainerId = member.primaryTrainerId
    await this.prisma.member.update({
      where: { memberId: member.memberId },
      data: { primaryTrainerId: null },
    })

    // Đồng bộ vòng đời hội thoại Chat khi huỷ PT
    if (oldTrainerId) {
      await this.chatService.archiveConversation(member.memberId, oldTrainerId)
    }

    return { data: { primaryTrainerId: null, trainerName: null } }
  }
}
