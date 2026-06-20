import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class TrainerAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

    const updated = await this.prisma.member.update({
      where: { memberId },
      data: { primaryTrainerId: trainerId != null ? BigInt(trainerId) : null },
    })

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
      include: { user: { select: { fullName: true } } },
      orderBy: { staffCode: 'asc' },
    })
    return {
      data: trainers.map((t) => ({
        staffId: t.staffId.toString(),
        staffCode: t.staffCode,
        fullName: t.user.fullName,
        position: t.position,
      })),
    }
  }

  async selfAssignTrainer(actorUserId: bigint, trainerId: number | null) {
    const member = await this.prisma.member.findFirst({
      where: { userId: actorUserId, deletedAt: null },
      include: {
        subscriptions: {
          where: { deletedAt: null, status: SubscriptionStatus.active, endDate: { gte: todayVN() } },
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

      await this.prisma.member.update({
        where: { memberId: member.memberId },
        data: { primaryTrainerId: BigInt(trainerId) },
      })
      return {
        data: { primaryTrainerId: trainerId.toString(), trainerName: trainer.user.fullName },
      }
    }

    await this.prisma.member.update({
      where: { memberId: member.memberId },
      data: { primaryTrainerId: null },
    })
    return { data: { primaryTrainerId: null, trainerName: null } }
  }
}
