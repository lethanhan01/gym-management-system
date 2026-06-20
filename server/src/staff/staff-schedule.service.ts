import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { StaffShift } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateScheduleDto } from './dto/create-schedule.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function parseDateOnly(value: string): Date {
  return new Date(value)
}

@Injectable()
export class StaffScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listSchedules(staffId: bigint) {
    const staff = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null } })
    if (!staff)
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff khong ton tai',
      })
    const rows = await this.prisma.staffSchedule.findMany({
      where: { staffId, deletedAt: null },
      orderBy: [{ workDate: 'asc' }, { shift: 'asc' }],
    })
    return rows.map((r) => this.serializeSchedule(r))
  }

  async createSchedule(staffId: bigint, dto: CreateScheduleDto, actorUserId: bigint) {
    const staff = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null } })
    if (!staff)
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff khong ton tai',
      })
    if (staff.position !== 'staff') {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_SCHEDULE_STAFF_POSITION',
        message: 'Chi duoc phan cong lich lam viec cho nhan vien staff',
      })
    }

    const today = todayVN()
    const seen = new Set<string>()
    const schedules = dto.schedules.map((entry) => {
      const workDate = parseDateOnly(entry.workDate)
      if (workDate < today) {
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'workDate khong duoc o qua khu',
        })
      }
      const key = `${entry.shift}:${entry.workDate}`
      if (seen.has(key)) {
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Batch chua entry trung lap',
        })
      }
      seen.add(key)
      return { staffId, shift: entry.shift, workDate }
    })

    const conflicts = await this.prisma.staffSchedule.findMany({
      where: {
        staffId,
        deletedAt: null,
        OR: schedules.map((s) => ({ shift: s.shift, workDate: s.workDate })),
      },
    })
    if (conflicts.length > 0) {
      throw new ConflictException({
        success: false,
        code: 'SCHEDULE_CONFLICT',
        message: 'Lich da ton tai',
        details: {
          conflicts: conflicts.map((c) => ({
            shift: c.shift,
            workDate: c.workDate.toISOString().slice(0, 10),
          })),
        },
      })
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.staffSchedule.createMany({ data: schedules })
      return tx.staffSchedule.findMany({
        where: {
          staffId,
          deletedAt: null,
          OR: schedules.map((s) => ({ shift: s.shift, workDate: s.workDate })),
        },
        orderBy: [{ workDate: 'asc' }, { shift: 'asc' }],
      })
    })

    this.audit.log({
      actorUserId,
      action: 'schedule.assign',
      resourceType: 'staff_schedule',
      resourceId: staffId.toString(),
      afterData: {
        staffId: staffId.toString(),
        created: created.length,
        schedules: created.map((r) => this.serializeSchedule(r)),
      } as unknown as Record<string, unknown>,
    })
    return { created: created.length, schedules: created.map((r) => this.serializeSchedule(r)) }
  }

  async deleteSchedule(staffId: bigint, scheduleId: bigint, actorUserId: bigint) {
    const row = await this.prisma.staffSchedule.findFirst({
      where: { scheduleId, staffId, deletedAt: null },
    })
    if (!row)
      throw new NotFoundException({
        success: false,
        code: 'SCHEDULE_NOT_FOUND',
        message: 'Lich khong ton tai',
      })
    await this.prisma.staffSchedule.update({
      where: { scheduleId },
      data: { deletedAt: new Date() },
    })
    this.audit.log({
      actorUserId,
      action: 'schedule.remove',
      resourceType: 'staff_schedule',
      resourceId: scheduleId.toString(),
      beforeData: this.serializeSchedule(row) as unknown as Record<string, unknown>,
    })
    return { success: true }
  }

  async listAllSchedules(from: string, to: string) {
    const fromDate = parseDateOnly(from)
    const toDate = parseDateOnly(to)
    const records = await this.prisma.staffSchedule.findMany({
      where: {
        workDate: { gte: fromDate, lte: toDate },
        deletedAt: null,
        staff: { deletedAt: null, position: 'staff' },
      },
      include: {
        staff: {
          select: {
            staffCode: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ workDate: 'asc' }, { shift: 'asc' }],
    })
    return records.map((r) => ({
      scheduleId: r.scheduleId.toString(),
      staffId: r.staffId.toString(),
      staffCode: r.staff.staffCode,
      fullName: r.staff.user.fullName,
      shift: r.shift,
      workDate: r.workDate.toISOString().slice(0, 10),
    }))
  }

  private serializeSchedule(r: {
    scheduleId: bigint
    staffId: bigint
    shift: StaffShift
    workDate: Date
  }) {
    return {
      scheduleId: r.scheduleId.toString(),
      staffId: r.staffId.toString(),
      shift: r.shift,
      workDate: r.workDate.toISOString().slice(0, 10),
    }
  }
}

