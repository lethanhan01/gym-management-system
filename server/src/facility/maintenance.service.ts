import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { EquipmentStatus, MaintenanceStatus, Prisma } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto'
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto'
import { UpdateMaintenanceLogDto } from './dto/update-maintenance-log.dto'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function parseDateOnly(value: string): Date {
  return new Date(value)
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMaintenanceLogs(equipmentId: bigint, query: ListMaintenanceLogsDto) {
    const equipment = await this.prisma.equipment.findFirst({ where: { equipmentId } })
    if (!equipment) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    const { page = 1, pageSize = 20, status, from, to } = query
    const where: Prisma.MaintenanceLogWhereInput = { equipmentId }

    if (status) where.status = status
    if (from || to) {
      where.reportedAt = {
        ...(from ? { gte: parseDateOnly(from) } : {}),
        ...(to ? { lt: addDays(parseDateOnly(to), 1) } : {}),
      }
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.maintenanceLog.findMany({
        where,
        include: { reportedByStaff: { include: { user: true } } },
        orderBy: { reportedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.maintenanceLog.count({ where }),
    ])

    return { data: data.map((row) => this.serializeMaintenanceLog(row)), meta: this.buildMeta(page, pageSize, totalItems) }
  }

  async createMaintenanceLog(equipmentId: bigint, dto: CreateMaintenanceLogDto, actorUserId: bigint) {
    const equipment = await this.prisma.equipment.findFirst({ where: { equipmentId }, include: { room: true } })
    if (!equipment) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    if (equipment.status === EquipmentStatus.retired) {
      throw new ConflictException({ success: false, code: 'EQUIPMENT_RETIRED', message: 'Thiết bị đã thanh lý, không thể tạo maintenance log mới' })
    }

    const openCount = await this.prisma.maintenanceLog.count({ where: { equipmentId, status: { in: [MaintenanceStatus.reported, MaintenanceStatus.repairing] } } })
    if (openCount > 0) {
      throw new ConflictException({ success: false, code: 'EQUIPMENT_HAS_OPEN_MAINTENANCE', message: 'Thiết bị đã có maintenance mở, không thể báo thêm' })
    }

    const reporterStaff = await this.prisma.staff.findFirst({ where: { userId: actorUserId, deletedAt: null } })
    if (!reporterStaff) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Người báo hỏng phải có hồ sơ staff' })
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          equipmentId,
          reportedByStaffId: reporterStaff.staffId,
          description: dto.description,
          status: MaintenanceStatus.reported,
          reportedAt: new Date(),
        },
        include: { reportedByStaff: { include: { user: true } } },
      })

      let equipmentUpdated = equipment
      if (equipment.status === EquipmentStatus.active) {
        equipmentUpdated = await tx.equipment.update({ where: { equipmentId }, data: { status: EquipmentStatus.broken }, include: { room: true } })
      }

      return { log, equipmentUpdated }
    })

    this.audit.log({
      actorUserId,
      action: 'maintenance.create',
      resourceType: 'maintenance_log',
      resourceId: result.log.maintenanceId.toString(),
      afterData: {
        ...this.serializeMaintenanceLog(result.log),
        equipment_status_change: equipment.status === EquipmentStatus.active ? { from: 'active', to: 'broken' } : null,
      } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        maintenance: this.serializeMaintenanceLog(result.log),
        equipment: { equipmentId: result.equipmentUpdated.equipmentId.toString(), equipmentCode: result.equipmentUpdated.equipmentCode, status: result.equipmentUpdated.status },
      },
    }
  }

  async updateMaintenanceLog(maintenanceId: bigint, dto: UpdateMaintenanceLogDto, actorUserId: bigint) {
    const existing = await this.prisma.maintenanceLog.findFirst({
      where: { maintenanceId },
      include: { equipment: { include: { room: true } }, reportedByStaff: { include: { user: true } } },
    })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Maintenance log không tồn tại' })

    if (existing.status === MaintenanceStatus.resolved || existing.status === MaintenanceStatus.failed) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_ALREADY_CLOSED', message: 'Maintenance log đã đóng, không thể cập nhật tiếp' })
    }

    const nextStatus = dto.status
    if (nextStatus === MaintenanceStatus.repairing && existing.status !== MaintenanceStatus.reported) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_INVALID_STATE_TRANSITION', message: 'Chỉ có thể chuyển reported -> repairing' })
    }
    if ((nextStatus === MaintenanceStatus.resolved || nextStatus === MaintenanceStatus.failed) && existing.status !== MaintenanceStatus.repairing) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_INVALID_STATE_TRANSITION', message: 'Chỉ có thể chuyển repairing -> resolved/failed' })
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.MaintenanceLogUpdateInput = { status: nextStatus }
      if (nextStatus === MaintenanceStatus.resolved || nextStatus === MaintenanceStatus.failed) {
        updateData.resolvedAt = new Date()
      }

      const log = await tx.maintenanceLog.update({ where: { maintenanceId }, data: updateData, include: { reportedByStaff: { include: { user: true } } } })

      const equipmentStatus = nextStatus === MaintenanceStatus.repairing ? EquipmentStatus.repairing : nextStatus === MaintenanceStatus.resolved ? EquipmentStatus.active : EquipmentStatus.retired
      const equipment = await tx.equipment.update({ where: { equipmentId: existing.equipmentId }, data: { status: equipmentStatus }, include: { room: true } })

      return { log, equipment }
    })

    this.audit.log({
      actorUserId,
      action: nextStatus === MaintenanceStatus.repairing ? 'maintenance.update' : 'maintenance.resolve',
      resourceType: 'maintenance_log',
      resourceId: maintenanceId.toString(),
      beforeData: this.serializeMaintenanceLog(existing) as unknown as Record<string, unknown>,
      afterData: { ...this.serializeMaintenanceLog(result.log), equipment_status: result.equipment.status } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        maintenance: this.serializeMaintenanceLog(result.log),
        equipment: { equipmentId: result.equipment.equipmentId.toString(), equipmentCode: result.equipment.equipmentCode, status: result.equipment.status },
      },
    }
  }

  private serializeMaintenanceLog(log: { maintenanceId: bigint; equipmentId: bigint; reportedByStaffId: bigint; description: string; status: MaintenanceStatus | string; reportedAt: Date; resolvedAt: Date | null; reportedByStaff?: { staffId: bigint; staffCode: string; user: { fullName: string } } }) {
    return {
      maintenanceId: log.maintenanceId.toString(),
      equipmentId: log.equipmentId.toString(),
      reportedByStaff: log.reportedByStaff ? { staffId: log.reportedByStaff.staffId.toString(), staffCode: log.reportedByStaff.staffCode, fullName: log.reportedByStaff.user.fullName } : { staffId: log.reportedByStaffId.toString() },
      description: log.description,
      status: log.status,
      reportedAt: log.reportedAt,
      resolvedAt: log.resolvedAt,
    }
  }

  private buildMeta(page: number, pageSize: number, totalItems: number) {
    return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) }
  }
}
