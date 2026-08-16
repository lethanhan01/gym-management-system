import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProgressDto } from './dto'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingCaller as Caller } from './training.types'
@Injectable()
export class MemberProgressService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly caller: TrainingCallerResolverService) {}
  async listProgress(
    memberId: bigint,
    query: { from?: string; to?: string; limit?: string },
    caller: Caller
  ) {
    const isMemberOnly = this.caller.isMemberOnly(caller)
    const isPTOnly = this.caller.isTrainerOnly(caller)
    const isOwnerOrStaff = this.caller.isOwnerOrStaff(caller)

    if (isMemberOnly) {
      const selfMemberId = await this.caller.resolveMemberId(caller)
      if (selfMemberId !== memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Ban chi co the xem tien trinh cua minh',
        })
      }
    } else if (isPTOnly && !isOwnerOrStaff) {
      const member = await this.prisma.member.findFirst({
        where: { memberId, deletedAt: null },
        select: { primaryTrainerId: true },
      })
      const callerStaffId = await this.caller.resolveStaffId(caller)
      if (!member || member.primaryTrainerId !== callerStaffId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'PT chi co the xem tien trinh member minh phu trach',
        })
      }
    }

    const where: Prisma.MemberProgressWhereInput = { memberId, deletedAt: null }
    if (query.from)
      where.recordedAt = { ...(where.recordedAt as object), gte: new Date(query.from) }
    if (query.to) where.recordedAt = { ...(where.recordedAt as object), lte: new Date(query.to) }

    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50
    const records = await this.prisma.memberProgress.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
    return { data: records.map((p) => this.serializeProgress(p)) }
  }

  async recordProgress(memberId: bigint, dto: CreateProgressDto, caller: Caller) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: { memberId: true, primaryTrainerId: true },
    })
    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Member khong ton tai',
      })
    }

    if (this.caller.isMemberOnly(caller)) {
      const selfMemberId = await this.caller.resolveMemberId(caller)
      if (selfMemberId !== memberId) {
        throw new ForbiddenException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Khong co quyen ghi progress cho member khac',
        })
      }
    }

    const callerStaffId = await this.caller.resolveStaffId(caller)
    if (this.caller.isTrainerOnly(caller) && member.primaryTrainerId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'TRAINER_NOT_ASSIGNED',
        message: 'PT chi duoc ghi progress cho member co primary trainer la minh',
      })
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date()
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
    if (recordedAt > fiveMinFromNow) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'recordedAt khong duoc qua tuong lai 5 phut',
      })
    }

    if (!callerStaffId) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Tai khoan dang nhap khong gan voi Staff profile hop le',
      })
    }

    const progress = await this.prisma.memberProgress.create({
      data: {
        memberId: member.memberId,
        staffId: callerStaffId,
        weight: dto.weight !== undefined ? new Prisma.Decimal(dto.weight) : null,
        bmi: dto.bmi !== undefined ? new Prisma.Decimal(dto.bmi) : null,
        goal: dto.goal ?? null,
        notes: dto.notes ?? null,
        recordedAt,
      },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'progress.record',
      resourceType: 'member_progress',
      resourceId: progress.progressId.toString(),
      afterData: this.serializeProgress(progress) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeProgress(progress) }
  }

  async deleteProgress(id: bigint, caller: Caller) {
    const progress = await this.prisma.memberProgress.findFirst({
      where: { progressId: id, deletedAt: null },
    })
    if (!progress) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Progress record khong ton tai',
      })
    }

    const isOwnerOrStaff = this.caller.isOwnerOrStaff(caller)
    const callerStaffId = await this.caller.resolveStaffId(caller)
    if (!isOwnerOrStaff && progress.staffId !== callerStaffId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen xoa progress record nay',
      })
    }

    await this.prisma.memberProgress.update({
      where: { progressId: id },
      data: { deletedAt: new Date() },
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'progress.delete',
      resourceType: 'member_progress',
      resourceId: id.toString(),
    })
  }
  private serializeProgress(progress: Prisma.MemberProgressGetPayload<object>) {
    return {
      progressId: progress.progressId.toString(),
      memberId: progress.memberId.toString(),
      staffId: progress.staffId?.toString() ?? null,
      staffName: null as string | null,
      weight: progress.weight != null ? Number(progress.weight) : null,
      height: progress.height != null ? Number(progress.height) : null,
      bmi: progress.bmi != null ? Number(progress.bmi) : null,
      goal: progress.goal,
      notes: progress.notes,
      recordedAt: progress.recordedAt,
    }
}
}
