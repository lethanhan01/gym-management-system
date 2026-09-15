import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { Prisma, UserStatus, FeedbackStatus } from '@prisma/client'

import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AuditService } from '../common/audit/audit.service'
import { normalizeEmail } from '../common/normalization'
import { PrismaService } from '../prisma/prisma.service'
import { join } from 'path'
import * as fs from 'fs'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'
import { UpdateMyProfileDto } from './dto/update-my-profile.dto'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { GetStaffAttendanceDto } from './dto/staff-attendance.dto'
import { StaffAttendanceService } from './staff-attendance.service'
import { StaffScheduleService } from './staff-schedule.service'


export interface ListStaffQuery {
  page?: number
  pageSize?: number
  position?: string
  status?: string
  search?: string
  sort?: string
}

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scheduleService: StaffScheduleService,
    private readonly attendanceService: StaffAttendanceService
  ) {}

  private async generateStaffCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    for (let attempt = 0; attempt < 5; attempt++) {
      const seq = Math.floor(Math.random() * 900000) + 100000
      const code = `STF-${year}-${String(seq).padStart(6, '0')}`
      const existing = await tx.staff.findFirst({ where: { staffCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({
      success: false,
      code: 'STAFF_CODE_GENERATION_FAILED',
      message: 'Khong the tao staffCode',
    })
  }

  async create(dto: CreateStaffDto, actorUserId: bigint) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    })
    if (existing)
      throw new ConflictException({
        success: false,
        code: 'DUPLICATE_VALUE',
        message: 'Email da duoc su dung',
      })

    const defaultPasswordHash = await bcrypt.hash('Password123!', 12)
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizeEmail(dto.email),
          emailNormalized: normalizeEmail(dto.email),
          fullName: dto.fullName,
          phone: dto.phone ?? null,
          passwordHash: defaultPasswordHash,
          status: 'pending_verification',
          emailVerifiedAt: null,
        },
      })
      const staffCode = await this.generateStaffCode(tx)
      const staff = await tx.staff.create({
        data: { userId: user.userId, position: dto.position, staffCode },
      })

      if (dto.groupIds && dto.groupIds.length > 0) {
        await tx.userGroup.createMany({
          data: dto.groupIds.map((gid) => ({ userId: user.userId, groupId: BigInt(gid) })),
          skipDuplicates: true,
        })
      } else {
        const staffGroup = await tx.group.findUnique({
          where: { name: dto.position === 'trainer' ? 'trainer' : 'staff' },
        })
        if (staffGroup)
          await tx.userGroup.create({
            data: { userId: user.userId, groupId: staffGroup.groupId },
          })
      }

      return { user, staff }
    })

    this.audit.log({
      actorUserId,
      action: 'staff.create',
      resourceType: 'staff',
      resourceId: result.staff.staffId.toString(),
      afterData: { email: dto.email, staffCode: result.staff.staffCode } as unknown as Record<
        string,
        unknown
      >,
    })

    return this.serializeStaff(result.staff, result.user)
  }

  async list(query: ListStaffQuery, caller?: AuthenticatedUser) {
    const { page = 1, pageSize = 20, position, status, search, sort = 'staff_code:asc' } = query
    const where: Prisma.StaffWhereInput = {}
    if (status === 'deleted') {
      if (!caller?.roles.includes('owner')) {
        throw new BadRequestException({
          success: false,
          code: 'FORBIDDEN',
          message: 'Chi owner duoc xem staff da xoa',
        })
      }
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
      if (status && status !== 'active') where.user = { status: status as UserStatus }
    }
    if (position) where.position = position
    if (search) {
      where.OR = [
        { staffCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: { user: true },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: this.buildStaffOrder(sort),
      }),
      this.prisma.staff.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeStaff(s, s.user)),
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / Number(pageSize))),
      },
    }
  }

  async listTrainers(): Promise<{ staffId: string; fullName: string; position: string }[]> {
    const trainers = await this.prisma.staff.findMany({
      where: { deletedAt: null, position: { in: ['trainer', 'pt'] } },
      include: { user: { select: { fullName: true } } },
      orderBy: { staffCode: 'asc' },
    })
    return trainers.map((t) => ({
      staffId: t.staffId.toString(),
      fullName: t.user.fullName,
      position: t.position,
    }))
  }

  async get(staffId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId }, include: { user: true } })
    if (!s)
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff khong ton tai',
      })

    let ratings: { ratingAverage: number | null; totalReviews: number } | undefined
    if (s.position === 'trainer' || s.position === 'pt') {
      const feedbacks = this.prisma.feedback?.findMany
        ? await this.prisma.feedback.findMany({
            where: {
              subjectStaffId: s.staffId,
              feedbackType: 'staff',
              deletedAt: null,
              status: { not: FeedbackStatus.rejected },
            },
            select: { rating: true },
          })
        : []
      const totalReviews = feedbacks.length
      const ratingAverage =
        totalReviews > 0
          ? Math.round((feedbacks.reduce((acc, cur) => acc + cur.rating, 0) / totalReviews) * 10) / 10
          : null
      ratings = { ratingAverage, totalReviews }
    }

    return this.serializeStaff(s, s.user, ratings)
  }

  async update(staffId: bigint, dto: UpdateStaffDto, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({
      where: { staffId, deletedAt: null },
      include: { user: true },
    })
    if (!s)
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff khong ton tai',
      })

    const userUpdates: Prisma.UserUpdateInput = {}
    const staffUpdates: Prisma.StaffUpdateInput = {}
    if (dto.fullName !== undefined) {
      if (dto.fullName === null)
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'fullName khong duoc null',
        })
      userUpdates.fullName = dto.fullName
    }
    if (dto.phone !== undefined) userUpdates.phone = dto.phone
    if (dto.position !== undefined) {
      if (dto.position === null)
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'position khong duoc null',
        })
      staffUpdates.position = dto.position
    }
    if (dto.specialty !== undefined) staffUpdates.specialty = dto.specialty
    if (dto.experienceYears !== undefined) staffUpdates.experienceYears = dto.experienceYears
    if (dto.bio !== undefined) staffUpdates.bio = dto.bio

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0)
        await tx.user.update({ where: { userId: s.userId }, data: userUpdates })
      if (Object.keys(staffUpdates).length > 0)
        await tx.staff.update({ where: { staffId }, data: staffUpdates })
    })

    this.audit.log({
      actorUserId,
      action: 'staff.update',
      resourceType: 'staff',
      resourceId: staffId.toString(),
      beforeData: this.serializeStaff(s, s.user) as unknown as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>,
    })
    return this.get(staffId)
  }

  async updateMyProfile(staffId: bigint, userId: bigint, dto: UpdateMyProfileDto) {
    const s = await this.prisma.staff.findFirst({
      where: { staffId, deletedAt: null },
      include: { user: true },
    })
    if (!s) {
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff profile không tồn tại',
      })
    }

    const userUpdates: Prisma.UserUpdateInput = {}
    const staffUpdates: Prisma.StaffUpdateInput = {}

    if (dto.fullName !== undefined) {
      const trimmed = dto.fullName.trim()
      if (trimmed.length < 2 || trimmed.length > 200) {
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Họ và tên phải từ 2 đến 200 ký tự',
        })
      }
      userUpdates.fullName = trimmed
    }

    if (dto.phone !== undefined) {
      userUpdates.phone = dto.phone?.trim() || null
    }

    if (dto.specialty !== undefined) {
      staffUpdates.specialty = dto.specialty?.trim() || null
    }

    if (dto.experienceYears !== undefined) {
      staffUpdates.experienceYears = dto.experienceYears
    }

    if (dto.bio !== undefined) {
      staffUpdates.bio = dto.bio?.trim() || null
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({ where: { userId }, data: userUpdates })
      }
      if (Object.keys(staffUpdates).length > 0) {
        await tx.staff.update({ where: { staffId }, data: staffUpdates })
      }
    })

    this.audit.log({
      actorUserId: userId,
      action: 'staff.update_profile',
      resourceType: 'staff',
      resourceId: staffId.toString(),
      beforeData: this.serializeStaff(s, s.user) as unknown as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>,
    })

    return this.get(staffId)
  }

  async uploadAvatar(staffId: bigint, userId: bigint, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        code: 'FILE_REQUIRED',
        message: 'Vui lòng chọn file hình ảnh',
      })
    }

    const user = await this.prisma.user.findUnique({ where: { userId } })
    if (!user) {
      throw new NotFoundException({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      })
    }

    const storagePath = `uploads/avatars/${file.filename}`
    const publicUrl = `/uploads/avatars/${file.filename}`

    const createdFile = await this.prisma.file.create({
      data: {
        ownerUserId: userId,
        fileType: 'avatar',
        storagePath,
        publicUrl,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
      },
    })

    const oldAvatarFileId = user.avatarFileId

    await this.prisma.user.update({
      where: { userId },
      data: { avatarFileId: createdFile.fileId },
    })

    if (oldAvatarFileId) {
      try {
        const oldFile = await this.prisma.file.findUnique({ where: { fileId: oldAvatarFileId } })
        if (oldFile) {
          await this.prisma.file.delete({ where: { fileId: oldAvatarFileId } })
          const oldPath = join(process.cwd(), oldFile.storagePath)
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath)
          }
        }
      } catch {
        // Ignored
      }
    }

    this.audit.log({
      actorUserId: userId,
      action: 'user.upload_avatar',
      resourceType: 'user',
      resourceId: userId.toString(),
      afterData: { avatarFileId: createdFile.fileId.toString() },
    })

    return {
      avatarFileId: createdFile.fileId.toString(),
      avatarUrl: `/api/v1/files/${createdFile.fileId}`,
    }
  }

  async removeAvatar(staffId: bigint, userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { userId } })
    if (!user) {
      throw new NotFoundException({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      })
    }

    const oldAvatarFileId = user.avatarFileId
    if (!oldAvatarFileId) {
      return { success: true }
    }

    await this.prisma.user.update({
      where: { userId },
      data: { avatarFileId: null },
    })

    try {
      const oldFile = await this.prisma.file.findUnique({ where: { fileId: oldAvatarFileId } })
      if (oldFile) {
        await this.prisma.file.delete({ where: { fileId: oldAvatarFileId } })
        const oldPath = join(process.cwd(), oldFile.storagePath)
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath)
        }
      }
    } catch {
      // Ignored
    }

    this.audit.log({
      actorUserId: userId,
      action: 'user.remove_avatar',
      resourceType: 'user',
      resourceId: userId.toString(),
      beforeData: { avatarFileId: oldAvatarFileId.toString() },
    })

    return { success: true }
  }


  async delete(staffId: bigint, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({
      where: { staffId },
      include: { user: true },
    })
    if (!s)
      throw new NotFoundException({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff khong ton tai',
      })

    if (s.userId === actorUserId)
      throw new ForbiddenException({
        success: false,
        code: 'CANNOT_DELETE_SELF',
        message: 'Khong the xoa tai khoan cua chinh minh',
      })

    const userId = s.userId
    const beforeData = this.serializeStaff(s, s.user)

    await this.prisma.$transaction(async (tx) => {
      // Training sessions của trainer này: nullify sessionId trong attendance logs (giữ lịch sử hội viên), rồi xóa sessions
      const sessionIds = await tx.trainingSession
        .findMany({ where: { trainerStaffId: staffId }, select: { sessionId: true } })
        .then((rows) => rows.map((r) => r.sessionId))
      if (sessionIds.length > 0) {
        await tx.attendanceLog.updateMany({
          where: { sessionId: { in: sessionIds } },
          data: { sessionId: null },
        })
      }
      await tx.trainingSession.deleteMany({ where: { trainerStaffId: staffId } })

      // Maintenance logs: reportedByStaffId NOT NULL → phải xóa
      await tx.maintenanceLog.deleteMany({ where: { reportedByStaffId: staffId } })

      // Records riêng của nhân viên
      await tx.staffAttendanceLog.deleteMany({ where: { staffId } })
      await tx.staffSchedule.deleteMany({ where: { staffId } })

      // Nullify optional FK references tới staff này
      await tx.member.updateMany({
        where: { primaryTrainerId: staffId },
        data: { primaryTrainerId: null },
      })
      await tx.subscription.updateMany({ where: { trainerId: staffId }, data: { trainerId: null } })
      await tx.memberProgress.updateMany({ where: { staffId }, data: { staffId: null } })
      await tx.exercise.updateMany({
        where: { createdByStaffId: staffId },
        data: { createdByStaffId: null },
      })
      await tx.workoutPlan.updateMany({
        where: { creatorStaffId: staffId },
        data: { creatorStaffId: null },
      })
      await tx.memberWorkoutPlan.updateMany({
        where: { assignedByStaffId: staffId },
        data: { assignedByStaffId: null },
      })
      await tx.feedback.updateMany({
        where: { handledByStaffId: staffId },
        data: { handledByStaffId: null },
      })
      await tx.feedback.updateMany({
        where: { subjectStaffId: staffId },
        data: { subjectStaffId: null },
      })

      // Anonymize audit logs (giữ audit trail, bỏ actor reference)
      await tx.auditLog.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } })

      // Files: clear avatarFileId cho mọi user dùng file của nhân viên này, rồi xóa files
      const ownedFileIds = await tx.file
        .findMany({ where: { ownerUserId: userId }, select: { fileId: true } })
        .then((rows) => rows.map((r) => r.fileId))
      if (ownedFileIds.length > 0) {
        await tx.user.updateMany({
          where: { avatarFileId: { in: ownedFileIds } },
          data: { avatarFileId: null },
        })
        await tx.file.deleteMany({ where: { ownerUserId: userId } })
      }

      // UserGroup: cascade sẽ xử lý khi xóa user, xóa explicit để đảm bảo
      await tx.userGroup.deleteMany({ where: { userId } })

      // Xóa staff trước (staff.userId → user.userId), rồi xóa user
      await tx.staff.delete({ where: { staffId } })
      await tx.user.delete({ where: { userId } })
    })

    this.audit.log({
      actorUserId,
      action: 'staff.delete',
      resourceType: 'staff',
      resourceId: staffId.toString(),
      beforeData: beforeData as unknown as Record<string, unknown>,
    })
    return { success: true }
  }

  async listSchedules(staffId: bigint) {
    return this.scheduleService.listSchedules(staffId)
  }

  async createSchedule(staffId: bigint, dto: CreateScheduleDto, actorUserId: bigint) {
    return this.scheduleService.createSchedule(staffId, dto, actorUserId)
  }

  async deleteSchedule(staffId: bigint, scheduleId: bigint, actorUserId: bigint) {
    return this.scheduleService.deleteSchedule(staffId, scheduleId, actorUserId)
  }

  async listAllSchedules(from: string, to: string) {
    return this.scheduleService.listAllSchedules(from, to)
  }

  private serializeStaff(
    s: {
      staffId: bigint
      userId: bigint
      staffCode: string
      position: string
      specialty?: string | null
      experienceYears?: number | null
      bio?: string | null
      deletedAt?: Date | null
    },
    user: {
      fullName: string
      email: string
      phone?: string | null
      status?: string
      avatarFileId?: bigint | null
    },
    ratings?: { ratingAverage: number | null; totalReviews: number }
  ) {
    const avatarFileId = user.avatarFileId ? user.avatarFileId.toString() : null
    return {
      staffId: s.staffId.toString(),
      userId: s.userId.toString(),
      staffCode: s.staffCode,
      position: s.position,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? null,
      status: s.deletedAt ? 'deleted' : user.status,
      specialty: s.specialty ?? null,
      experienceYears: s.experienceYears ?? null,
      bio: s.bio ?? null,
      avatarFileId,
      avatarUrl: avatarFileId ? `/api/v1/files/${avatarFileId}` : null,
      ratingAverage: ratings?.ratingAverage ?? null,
      totalReviews: ratings?.totalReviews ?? 0,
      deletedAt: s.deletedAt ?? null,
    }
  }

  async attendanceCheckIn(staffId: bigint) {
    return this.attendanceService.checkIn(staffId)
  }

  async attendanceCheckOut(staffId: bigint) {
    return this.attendanceService.checkOut(staffId)
  }

  async getMyAttendance(staffId: bigint, dto: GetStaffAttendanceDto) {
    return this.attendanceService.getMyAttendance(staffId, dto)
  }

  private buildStaffOrder(sort: string): Prisma.StaffOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'desc' ? 'desc' : 'asc'
    if (field === 'fullName' || field === 'full_name') return { user: { fullName: dir } }
    return { staffCode: dir }
  }
}
