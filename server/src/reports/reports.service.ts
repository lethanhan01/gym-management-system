import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  FeedbackSeverity,
  FeedbackType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TrainingSessionStatus,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

// Ca sáng 07:00-12:00, ca chiều 12:00-17:00, ca tối 17:00-22:00
const SHIFT_DURATION_MINUTES: Record<string, number> = {
  morning: 300,
  afternoon: 300,
  evening: 300,
}

interface DateRange {
  from: string
  to: string
  start: Date
  endExclusive: Date
  startDate: Date
  endDate: Date
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async revenue(from?: string, to?: string, method?: string) {
    const range = this.parseRange(from, to)
    try {
      const payments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.success,
          paidAt: { gte: range.start, lt: range.endExclusive },
          ...(method ? { method: method as PaymentMethod } : {}),
        },
        select: { paidAt: true, amount: true },
      })

      const byDate = new Map<string, Prisma.Decimal>()
      let total = new Prisma.Decimal(0)
      for (const payment of payments) {
        const date = this.vnDateKey(payment.paidAt)
        const next = (byDate.get(date) ?? new Prisma.Decimal(0)).add(payment.amount)
        byDate.set(date, next)
        total = total.add(payment.amount)
      }

      return {
        data: {
          total: this.formatDecimal(total),
          currency: 'VND',
          breakdown: [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount: this.formatDecimal(amount) })),
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Revenue report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async members(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const members = await this.prisma.member.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: range.start, lt: range.endExclusive },
        },
        select: { createdAt: true },
      })

      const byDate = new Map<string, number>()
      for (const member of members) {
        const date = this.vnDateKey(member.createdAt)
        byDate.set(date, (byDate.get(date) ?? 0) + 1)
      }

      return {
        data: {
          total: members.length,
          breakdown: [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count })),
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Members report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async renewals(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const expiring = await this.prisma.subscription.findMany({
        where: {
          endDate: { gte: range.startDate, lte: range.endDate },
          member: { deletedAt: null },
        },
        select: { memberId: true, endDate: true },
      })

      const maxEndByMember = new Map<string, Date>()
      for (const sub of expiring) {
        const key = sub.memberId.toString()
        const current = maxEndByMember.get(key)
        if (!current || sub.endDate > current) maxEndByMember.set(key, sub.endDate)
      }

      const memberIds = Array.from(maxEndByMember.keys()).map((id) => BigInt(id))

      const futureSubscriptions = await this.prisma.subscription.findMany({
        where: {
          memberId: { in: memberIds },
        },
        select: { memberId: true, startDate: true },
      })

      let renewed = 0
      for (const [memberIdStr, maxEndDate] of maxEndByMember) {
        const memberId = BigInt(memberIdStr)
        const hasRenewed = futureSubscriptions.some(
          (sub) => sub.memberId === memberId && sub.startDate > maxEndDate
        )
        if (hasRenewed) renewed += 1
      }

      const eligible = maxEndByMember.size
      const churned = eligible - renewed
      return {
        data: {
          renewed,
          churned,
          renewalRate: eligible === 0 ? null : Math.round((renewed / eligible) * 100) / 100,
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Renewals report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async employeePerformance(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const staff = await this.prisma.staff.findMany({
        where: { deletedAt: null, NOT: { position: 'trainer' } },
        include: { user: true },
      })

      if (staff.length === 0) {
        return { data: [], meta: { from: range.from, to: range.to } }
      }

      const staffIds = staff.map((s) => s.staffId)

      const [schedulesRows, attendanceLogsRows, feedbackRows] = await Promise.all([
        this.prisma.staffSchedule.findMany({
          where: {
            staffId: { in: staffIds },
            deletedAt: null,
            workDate: { gte: range.startDate, lte: range.endDate },
          },
          select: { staffId: true, shift: true },
        }),
        this.prisma.staffAttendanceLog.findMany({
          where: {
            staffId: { in: staffIds },
            checkIn: { gte: range.start, lt: range.endExclusive },
          },
          select: { staffId: true, checkIn: true, checkOut: true },
        }),
        this.prisma.feedback.findMany({
          where: {
            subjectStaffId: { in: staffIds },
            feedbackType: FeedbackType.staff,
            deletedAt: null,
            createdAt: { gte: range.start, lt: range.endExclusive },
          },
          select: { subjectStaffId: true, severity: true },
        }),
      ])

      const scheduleMap = new Map<string, { shift: string }[]>()
      for (const s of schedulesRows) {
        const key = (s.staffId as bigint).toString()
        if (!scheduleMap.has(key)) scheduleMap.set(key, [])
        scheduleMap.get(key)!.push({ shift: s.shift })
      }

      const attendanceMap = new Map<string, { checkIn: Date; checkOut: Date | null }[]>()
      for (const a of attendanceLogsRows) {
        const key = (a.staffId as bigint).toString()
        if (!attendanceMap.has(key)) attendanceMap.set(key, [])
        attendanceMap.get(key)!.push({ checkIn: a.checkIn, checkOut: a.checkOut })
      }

      const feedbackMap = new Map<string, { severity: string }[]>()
      for (const f of feedbackRows) {
        const key = (f.subjectStaffId as bigint).toString()
        if (!feedbackMap.has(key)) feedbackMap.set(key, [])
        feedbackMap.get(key)!.push({ severity: f.severity })
      }

      const rows = staff.map((s) => {
        const staffKey = s.staffId.toString()
        const schedules = scheduleMap.get(staffKey) ?? []
        const attendanceLogs = attendanceMap.get(staffKey) ?? []
        const feedback = feedbackMap.get(staffKey) ?? []

        const expectedMinutes = schedules.reduce(
          (sum, sch) => sum + (SHIFT_DURATION_MINUTES[sch.shift] ?? 480),
          0,
        )
        const actualMinutes = attendanceLogs.reduce((sum, log) => {
          if (!log.checkOut) return sum
          return sum + Math.floor((log.checkOut.getTime() - log.checkIn.getTime()) / 60000)
        }, 0)
        const performancePercent =
          expectedMinutes === 0
            ? 0
            : Math.min(100, Math.round((actualMinutes / expectedMinutes) * 100))

        const avg =
          feedback.length === 0
            ? null
            : Math.round(
                (feedback.reduce((sum, f) => sum + this.severityScore(f.severity as FeedbackSeverity), 0) /
                  feedback.length) *
                  100,
              ) / 100

        return {
          staffId: s.staffId.toString(),
          staffCode: s.staffCode,
          fullName: s.user.fullName,
          position: s.position,
          shiftsWorked: schedules.length,
          avgFeedbackSeverityScore: avg,
          performancePercent,
          actualMinutes,
          expectedMinutes,
        }
      })

      return {
        data: rows.sort(
          (a, b) =>
            b.performancePercent - a.performancePercent ||
            Number(BigInt(a.staffId) - BigInt(b.staffId)),
        ),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Employee performance report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async employeePerformanceDetail(staffId: string, from?: string, to?: string) {
    if (!staffId || !/^\d+$/.test(staffId)) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'staffId khong hop le',
      })
    }
    const range = this.parseRange(from, to)
    const staff = await this.prisma.staff.findFirst({
      where: { staffId: BigInt(staffId), deletedAt: null },
      include: { user: true },
    })
    if (!staff) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Nhan vien khong ton tai',
      })
    }

    const [schedules, attendanceLogs] = await Promise.all([
      this.prisma.staffSchedule.findMany({
        where: {
          staffId: staff.staffId,
          deletedAt: null,
          workDate: { gte: range.startDate, lte: range.endDate },
        },
        orderBy: { workDate: 'asc' },
      }),
      this.prisma.staffAttendanceLog.findMany({
        where: {
          staffId: staff.staffId,
          checkIn: { gte: range.start, lt: range.endExclusive },
        },
        orderBy: { checkIn: 'asc' },
      }),
    ])

    return {
      data: {
        staffId: staff.staffId.toString(),
        staffCode: staff.staffCode,
        fullName: staff.user.fullName,
        position: staff.position,
        attendanceLogs: attendanceLogs.map((log) => ({
          logId: log.logId.toString(),
          date: this.vnDateKey(log.checkIn),
          checkIn: log.checkIn.toISOString(),
          checkOut: log.checkOut?.toISOString() ?? null,
          durationMinutes: log.checkOut
            ? Math.floor((log.checkOut.getTime() - log.checkIn.getTime()) / 60000)
            : null,
        })),
        schedules: schedules.map((s) => ({
          scheduleId: s.scheduleId.toString(),
          shift: s.shift,
          workDate: this.vnDateKey(s.workDate),
        })),
      },
      meta: { from: range.from, to: range.to },
    }
  }

  async staffPerformance(from?: string, to?: string, staffId?: string) {
    const range = this.parseRange(from, to)
    if (staffId && !/^\d+$/.test(staffId)) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'staffId khong hop le',
      })
    }

    try {
      const staff = await this.prisma.staff.findMany({
        where: {
          deletedAt: null,
          position: 'trainer',
          ...(staffId ? { staffId: BigInt(staffId) } : {}),
        },
        include: { user: true },
      })

      if (staff.length === 0) {
        return { data: [], meta: { from: range.from, to: range.to } }
      }

      const staffIds = staff.map((s) => s.staffId)

      // Batch 2 queries thay vì N×2 queries song song — tránh cạn connection pool
      const [sessionCounts, feedbackRows] = await Promise.all([
        this.prisma.trainingSession.groupBy({
          by: ['trainerStaffId'],
          where: {
            trainerStaffId: { in: staffIds },
            status: TrainingSessionStatus.completed,
            deletedAt: null,
            startTime: { gte: range.start, lt: range.endExclusive },
          },
          _count: { _all: true },
        }),
        this.prisma.feedback.findMany({
          where: {
            subjectStaffId: { in: staffIds },
            feedbackType: FeedbackType.staff,
            deletedAt: null,
            createdAt: { gte: range.start, lt: range.endExclusive },
          },
          select: { subjectStaffId: true, severity: true },
        }),
      ])

      const sessionCountMap = new Map<bigint, number>()
      for (const g of sessionCounts) {
        if (g.trainerStaffId != null) {
          sessionCountMap.set(g.trainerStaffId as bigint, g._count._all)
        }
      }
      const feedbackMap = new Map<string, { severity: string }[]>()
      for (const f of feedbackRows) {
        const key = (f.subjectStaffId as bigint).toString()
        if (!feedbackMap.has(key)) feedbackMap.set(key, [])
        feedbackMap.get(key)!.push({ severity: f.severity })
      }

      const rows = staff.map((s) => {
        const completedSessions = sessionCountMap.get(s.staffId) ?? 0
        const feedback = feedbackMap.get(s.staffId.toString()) ?? []

        const avg =
          feedback.length === 0
            ? null
            : Math.round(
                (feedback.reduce((sum, f) => sum + this.severityScore(f.severity as FeedbackSeverity), 0) /
                  feedback.length) *
                  100,
              ) / 100

        return {
          staffId: s.staffId.toString(),
          staffCode: s.staffCode,
          fullName: s.user.fullName,
          completedSessions,
          avgFeedbackSeverityScore: avg,
        }
      })

      return {
        data: rows.sort(
          (a, b) =>
            b.completedSessions - a.completedSessions ||
            a.staffId.localeCompare(b.staffId),
        ),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Staff performance report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async topPackages(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const grouped = await this.prisma.subscription.groupBy({
        by: ['packageId'],
        where: {
          createdAt: { gte: range.start, lt: range.endExclusive },
          deletedAt: null,
        },
        _count: { subscriptionId: true },
        orderBy: { _count: { subscriptionId: 'desc' } },
      })

      if (grouped.length === 0) {
        return { data: [], meta: { from: range.from, to: range.to } }
      }

      const packageIds = grouped.map((g) => g.packageId)
      const packages = await this.prisma.package.findMany({
        where: { packageId: { in: packageIds }, deletedAt: null },
        select: { packageId: true, name: true, price: true, durationDays: true },
      })

      const packageMap = new Map(packages.map((p) => [p.packageId.toString(), p]))

      return {
        data: grouped.map((g) => {
          const pkg = packageMap.get(g.packageId.toString())
          return {
            packageId: g.packageId.toString(),
            name: pkg?.name ?? '—',
            price: pkg ? this.formatDecimal(pkg.price) : '0',
            durationDays: pkg?.durationDays ?? 0,
            count: g._count.subscriptionId,
          }
        }),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Top packages report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  private parseRange(from?: string, to?: string): DateRange {
    if (!from || !to || !this.isDateOnly(from) || !this.isDateOnly(to)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'from/to phai co format YYYY-MM-DD',
      })
    }
    if (from > to) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'from phai truoc hoac bang to',
      })
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    if (to > today) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'Ngày kết thúc không được vượt quá ngày hiện tại.',
      })
    }

    const start = new Date(`${from}T00:00:00+07:00`)
    const endExclusive = new Date(`${to}T00:00:00+07:00`)
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
    return {
      from,
      to,
      start,
      endExclusive,
      startDate: new Date(from),
      endDate: new Date(to),
    }
  }

  private isDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
  }

  private vnDateKey(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  }

  private formatDecimal(value: Prisma.Decimal): string {
    return value.toFixed(2).replace(/\.00$/, '')
  }

  private severityScore(severity: FeedbackSeverity): number {
    if (severity === FeedbackSeverity.high) return 3
    if (severity === FeedbackSeverity.medium) return 2
    return 1
  }
}
