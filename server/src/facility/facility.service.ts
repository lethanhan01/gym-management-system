import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { type Role } from '../auth/users.service'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto'
import { CreateRoomDto } from './dto/create-room.dto'
import { EquipmentService } from './equipment.service'
import { ListEquipmentDto } from './dto/list-equipment.dto'
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto'
import { ListRoomsDto } from './dto/list-rooms.dto'
import { MaintenanceService } from './maintenance.service'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { UpdateMaintenanceLogDto } from './dto/update-maintenance-log.dto'
import { UpdateRoomDto } from './dto/update-room.dto'

function toCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

@Injectable()
export class FacilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly equipment: EquipmentService,
    private readonly maintenance: MaintenanceService,
  ) {}

  async listRooms(query: ListRoomsDto) {
    const { page = 1, pageSize = 20, roomType, search, sort = 'room_code:asc' } = query
    const where: Prisma.GymRoomWhereInput = {}

    if (roomType) where.roomType = roomType
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { roomCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = { [toCamel(sortField ?? 'roomCode')]: sortDir === 'asc' ? 'asc' : 'desc' } as Prisma.GymRoomOrderByWithRelationInput

    const [data, totalItems] = await Promise.all([
      this.prisma.gymRoom.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
      this.prisma.gymRoom.count({ where }),
    ])

    return {
      data: data.map((room) => this.serializeRoom(room)),
      meta: this.buildMeta(page, pageSize, totalItems),
    }
  }

  async getRoom(roomId: bigint) {
    const room = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!room) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    const [equipmentCount, activeSessionsCount] = await Promise.all([
      this.prisma.equipment.count({ where: { roomId } }),
      this.prisma.trainingSession.count({ where: { roomId, deletedAt: null, endTime: { gt: new Date() } } }),
    ])

    return {
      data: {
        ...this.serializeRoom(room),
        stats: { equipmentCount, activeSessionsCount },
      },
    }
  }

  async createRoom(dto: CreateRoomDto, actorUserId: bigint) {
    const roomCode = dto.roomCode ?? (await this.generateRoomCode())

    const room = await this.prisma.gymRoom.create({
      data: {
        roomCode,
        name: dto.name,
        roomType: dto.roomType ?? null,
        capacity: dto.capacity,
        description: dto.description ?? null,
      },
    })

    this.audit.log({
      actorUserId,
      action: 'room.create',
      resourceType: 'room',
      resourceId: room.roomId.toString(),
      afterData: this.serializeRoom(room) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeRoom(room) }
  }

  async updateRoom(roomId: bigint, dto: UpdateRoomDto, actorUserId: bigint) {
    const existing = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    if (!this.hasAnyField(dto)) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Phải truyền ít nhất một trường để cập nhật' })
    }

    const updated = await this.prisma.gymRoom.update({
      where: { roomId },
      data: {
        ...(dto.roomCode !== undefined ? { roomCode: dto.roomCode } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.roomType !== undefined ? { roomType: dto.roomType } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    })

    this.audit.log({
      actorUserId,
      action: 'room.update',
      resourceType: 'room',
      resourceId: roomId.toString(),
      beforeData: this.serializeRoom(existing) as unknown as Record<string, unknown>,
      afterData: this.serializeRoom(updated) as unknown as Record<string, unknown>,
    })

    return { data: this.serializeRoom(updated) }
  }

  async deleteRoom(roomId: bigint, actorUserId: bigint) {
    const existing = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    const [equipmentCount, activeSessionsCount] = await Promise.all([
      this.prisma.equipment.count({ where: { roomId } }),
      this.prisma.trainingSession.count({ where: { roomId, deletedAt: null, endTime: { gt: new Date() } } }),
    ])

    if (equipmentCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'ROOM_HAS_EQUIPMENT',
        message: 'Phòng còn thiết bị tham chiếu, không thể xóa',
        details: { equipmentCount },
      })
    }

    if (activeSessionsCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'ROOM_HAS_ACTIVE_SESSIONS',
        message: 'Phòng còn lịch tập chưa kết thúc, không thể xóa',
        details: { upcomingSessionCount: activeSessionsCount },
      })
    }

    await this.prisma.gymRoom.delete({ where: { roomId } })

    this.audit.log({
      actorUserId,
      action: 'room.delete',
      resourceType: 'room',
      resourceId: roomId.toString(),
      beforeData: this.serializeRoom(existing) as unknown as Record<string, unknown>,
    })
  }

  async listEquipment(query: ListEquipmentDto) {
    return this.equipment.listEquipment(query)
  }

  async getEquipment(equipmentId: bigint) {
    return this.equipment.getEquipment(equipmentId)
  }

  async createEquipment(dto: CreateEquipmentDto, actorUserId: bigint) {
    return this.equipment.createEquipment(dto, actorUserId)
  }

  async updateEquipment(equipmentId: bigint, dto: UpdateEquipmentDto, actorUserId: bigint) {
    return this.equipment.updateEquipment(equipmentId, dto, actorUserId)
  }

  async deleteEquipment(equipmentId: bigint, actorUserId: bigint, callerRoles: Role[], force = false) {
    return this.equipment.deleteEquipment(equipmentId, actorUserId, callerRoles, force)
  }

  async listMaintenanceLogs(equipmentId: bigint, query: ListMaintenanceLogsDto) {
    return this.maintenance.listMaintenanceLogs(equipmentId, query)
  }

  async createMaintenanceLog(equipmentId: bigint, dto: CreateMaintenanceLogDto, actorUserId: bigint) {
    return this.maintenance.createMaintenanceLog(equipmentId, dto, actorUserId)
  }

  async updateMaintenanceLog(maintenanceId: bigint, dto: UpdateMaintenanceLogDto, actorUserId: bigint) {
    return this.maintenance.updateMaintenanceLog(maintenanceId, dto, actorUserId)
  }

  private serializeRoom(room: { roomId: bigint; roomCode: string; name: string; roomType: string | null; capacity: number; description: string | null }) {
    return { roomId: room.roomId.toString(), roomCode: room.roomCode, name: room.name, roomType: room.roomType, capacity: room.capacity, description: room.description }
  }

  private buildMeta(page: number, pageSize: number, totalItems: number) {
    return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) }
  }

  private hasAnyField(dto: object): boolean {
    return Object.values(dto as Record<string, unknown>).some((value) => value !== undefined)
  }

  private async generateRoomCode(): Promise<string> {
    const rows = await this.prisma.gymRoom.findMany({ select: { roomCode: true } })
    const maxNum = rows.reduce((max, { roomCode }) => {
      const n = Number.parseInt(roomCode.replace(/^ROOM-0*/, ''), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    for (let i = 1; i <= 20; i++) {
      const code = `ROOM-${String(maxNum + i).padStart(3, '0')}`
      const exists = await this.prisma.gymRoom.findFirst({ where: { roomCode: code } })
      if (!exists) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'ROOM_CODE_GENERATION_FAILED', message: 'Không thể tự sinh roomCode' })
  }
}
