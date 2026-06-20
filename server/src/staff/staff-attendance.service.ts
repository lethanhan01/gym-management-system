import { ConflictException, Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { GetStaffAttendanceDto } from './dto/staff-attendance.dto'

/** Chuỗi ngày theo giờ VN (YYYY-MM-DD) để so sánh cùng ngày. */
function vnDayStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

@Injectable()
export class StaffAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async checkIn(staffId: bigint) {
    const now = new Date()
    const open = await this.prisma.staffAttendanceLog.findFirst({
      where: { staffId, checkOut: null },
    })
    if (open) {
      // Phiên mở từ HÔM NAY → đã chấm vào rồi, phải chấm ra trước.
      if (vnDayStr(open.checkIn) === vnDayStr(now)) {
        throw new ConflictException({
          success: false,
          code: 'ALREADY_CHECKED_IN',
          message: 'Ban da check-in, vui long check-out truoc',
        })
      }
      // Phiên mở từ ngày trước (quên chấm ra) → ngày công không hợp lệ, hủy bỏ.
      await this.prisma.staffAttendanceLog.delete({ where: { logId: open.logId } })
    }
    const record = await this.prisma.staffAttendanceLog.create({
      data: { staffId, checkIn: now },
    })
    return this.serializeAttendanceLog(record)
  }

  async checkOut(staffId: bigint) {
    const open = await this.prisma.staffAttendanceLog.findFirst({
      where: { staffId, checkOut: null },
    })
    if (!open) {
      throw new ConflictException({
        success: false,
        code: 'NOT_CHECKED_IN',
        message: 'Khong co phien check-in nao dang mo',
      })
    }
    const now = new Date()
    // Cặp chấm công phải nằm trong cùng một ngày. Chấm ra khác ngày → hủy ngày công.
    if (vnDayStr(open.checkIn) !== vnDayStr(now)) {
      await this.prisma.staffAttendanceLog.delete({ where: { logId: open.logId } })
      throw new ConflictException({
        success: false,
        code: 'ATTENDANCE_VOIDED_DIFFERENT_DAY',
        message: 'Ca lam viec da bi huy vi cham ra khac ngay voi cham vao',
      })
    }
    const record = await this.prisma.staffAttendanceLog.update({
      where: { logId: open.logId },
      data: { checkOut: now },
    })
    return this.serializeAttendanceLog(record)
  }

  async getMyAttendance(staffId: bigint, dto: GetStaffAttendanceDto) {
    const now = new Date()
    const from = dto.from ? new Date(dto.from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = dto.to ? new Date(dto.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const pageSize = dto.pageSize ? Math.min(Number(dto.pageSize), 200) : 100

    const [data, total] = await Promise.all([
      this.prisma.staffAttendanceLog.findMany({
        where: { staffId, checkIn: { gte: from, lte: to } },
        orderBy: { checkIn: 'desc' },
        take: pageSize,
      }),
      this.prisma.staffAttendanceLog.count({
        where: { staffId, checkIn: { gte: from, lte: to } },
      }),
    ])

    return { data: data.map((r) => this.serializeAttendanceLog(r)), total }
  }

  private serializeAttendanceLog(r: { logId: bigint; staffId: bigint; checkIn: Date; checkOut: Date | null }) {
    const durationMinutes =
      r.checkOut ? Math.floor((r.checkOut.getTime() - r.checkIn.getTime()) / 60000) : null
    return {
      logId: r.logId.toString(),
      staffId: r.staffId.toString(),
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut ? r.checkOut.toISOString() : null,
      durationMinutes,
    }
  }
}
