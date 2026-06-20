import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MemberProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async recordSelfProgress(memberId: bigint, dto: { weight: number; height?: number }) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: { memberId: true },
    })
    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Member không tồn tại',
      })
    }

    let bmi: number | null = null
    if (dto.height && dto.height > 0) {
      const heightM = dto.height / 100
      bmi = Math.round((dto.weight / (heightM * heightM)) * 10) / 10
    }

    const progress = await this.prisma.memberProgress.create({
      data: {
        memberId: member.memberId,
        staffId: null,
        weight: new Prisma.Decimal(dto.weight),
        height: dto.height != null ? new Prisma.Decimal(dto.height) : null,
        bmi: bmi != null ? new Prisma.Decimal(bmi) : null,
        recordedAt: new Date(),
      },
    })

    return {
      data: {
        progressId: progress.progressId.toString(),
        memberId: progress.memberId.toString(),
        staffId: null,
        staffName: null,
        weight: Number(progress.weight),
        height: progress.height != null ? Number(progress.height) : null,
        bmi: progress.bmi != null ? Number(progress.bmi) : null,
        goal: null,
        notes: null,
        recordedAt: progress.recordedAt,
      },
    }
  }
}
