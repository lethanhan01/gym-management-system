import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { EquipmentService } from './equipment.service'
import { FacilityService } from './facility.service'
import { MaintenanceService } from './maintenance.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoom(overrides: object = {}) {
  return {
    roomId: 1n,
    roomCode: 'RM-001',
    name: 'Main Hall',
    roomType: 'gym',
    capacity: 50,
    description: null,
    ...overrides,
  }
}

function makeEquipment(overrides: object = {}) {
  return {
    equipmentId: 10n,
    roomId: 1n,
    equipmentCode: 'EQ-000001',
    name: 'Treadmill',
    importDate: new Date('2023-01-01'),
    warrantyUntil: new Date('2025-01-01'),
    status: 'active',
    room: { roomCode: 'RM-001', name: 'Main Hall' },
    ...overrides,
  }
}

function makeMaintenanceLog(overrides: object = {}) {
  return {
    maintenanceId: 100n,
    equipmentId: 10n,
    reportedByStaffId: 5n,
    description: 'Screen broken',
    status: 'reported',
    reportedAt: new Date('2024-01-15'),
    resolvedAt: null,
    reportedByStaff: {
      staffId: 5n,
      staffCode: 'ST-001',
      user: { fullName: 'Staff One' },
    },
    ...overrides,
  }
}

function makeStaff(overrides: object = {}) {
  return {
    staffId: 5n,
    staffCode: 'ST-001',
    deletedAt: null,
    user: { fullName: 'Staff One' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    maintenanceLog: {
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    equipment: {
      update: jest.fn(),
      delete: jest.fn(),
    },
  }
}

const mockPrisma = {
  gymRoom: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  equipment: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  maintenanceLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  trainingSession: {
    count: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FacilityService', () => {
  let service: FacilityService
  let tx: ReturnType<typeof makeTx>

  beforeEach(() => {
    const equipment = new EquipmentService(mockPrisma as any, mockAudit as any)
    const maintenance = new MaintenanceService(mockPrisma as any, mockAudit as any)
    service = new FacilityService(mockPrisma as any, mockAudit as any, equipment, maintenance)
    jest.clearAllMocks()
    tx = makeTx()
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(tx)
      return arg
    })
  })

  // -------------------------------------------------------------------------
  // listRooms
  // -------------------------------------------------------------------------

  describe('listRooms', () => {
    beforeEach(() => {
      mockPrisma.gymRoom.findMany.mockResolvedValue([makeRoom()])
      mockPrisma.gymRoom.count.mockResolvedValue(1)
    })

    it('returns rooms with pagination meta', async () => {
      const result = await service.listRooms({ page: 1, pageSize: 10 } as any)

      expect(result.data).toHaveLength(1)
      expect(result.meta).toEqual(expect.objectContaining({ page: 1, pageSize: 10, totalItems: 1 }))
    })

    it('serializes roomId as string', async () => {
      const result = await service.listRooms({} as any)

      expect(result.data[0].roomId).toBe('1')
    })

    it('applies roomType filter when provided', async () => {
      await service.listRooms({ roomType: 'gym' } as any)

      const whereArg = mockPrisma.gymRoom.findMany.mock.calls[0][0].where
      expect(whereArg.roomType).toBe('gym')
    })

    it('applies OR search filter on name and roomCode', async () => {
      await service.listRooms({ search: 'hall' } as any)

      const whereArg = mockPrisma.gymRoom.findMany.mock.calls[0][0].where
      expect(whereArg.OR).toBeDefined()
      expect(whereArg.OR).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // getRoom
  // -------------------------------------------------------------------------

  describe('getRoom', () => {
    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(service.getRoom(999n)).rejects.toThrow(NotFoundException)
    })

    it('returns room with equipment and session stats', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.equipment.count.mockResolvedValue(5)
      mockPrisma.trainingSession.count.mockResolvedValue(2)

      const result = await service.getRoom(1n)

      expect(result.data.roomId).toBe('1')
      expect(result.data.stats.equipmentCount).toBe(5)
      expect(result.data.stats.activeSessionsCount).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // createRoom
  // -------------------------------------------------------------------------

  describe('createRoom', () => {
    it('creates room and calls audit.log with action room.create', async () => {
      const room = makeRoom()
      mockPrisma.gymRoom.create.mockResolvedValue(room)

      const result = await service.createRoom(
        { name: 'Main Hall', roomCode: 'RM-001', capacity: 50 } as any,
        1n
      )

      expect(mockPrisma.gymRoom.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'room.create' }))
      expect(result.data.roomId).toBe('1')
    })

    it('propagates Prisma P2002 for the global exception filter', async () => {
      mockPrisma.gymRoom.create.mockRejectedValue({ code: 'P2002' })

      await expect(
        service.createRoom({ name: 'Dup', roomCode: 'RM-001', capacity: 10 } as any, 1n)
      ).rejects.toEqual({ code: 'P2002' })
    })
  })

  // -------------------------------------------------------------------------
  // updateRoom
  // -------------------------------------------------------------------------

  describe('updateRoom', () => {
    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(service.updateRoom(999n, { name: 'X' } as any, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws BadRequestException when no fields provided', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())

      await expect(service.updateRoom(1n, {} as any, 1n)).rejects.toThrow(BadRequestException)
    })

    it('happy path: updates room and calls audit.log', async () => {
      const existing = makeRoom()
      const updated = makeRoom({ name: 'Updated Hall' })
      mockPrisma.gymRoom.findFirst.mockResolvedValue(existing)
      mockPrisma.gymRoom.update.mockResolvedValue(updated)

      const result = await service.updateRoom(1n, { name: 'Updated Hall' } as any, 1n)

      expect(mockPrisma.gymRoom.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'room.update' }))
      expect(result.data.name).toBe('Updated Hall')
    })
  })

  // -------------------------------------------------------------------------
  // deleteRoom
  // -------------------------------------------------------------------------

  describe('deleteRoom', () => {
    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(service.deleteRoom(999n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when room has equipment', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.equipment.count.mockResolvedValue(3)
      mockPrisma.trainingSession.count.mockResolvedValue(0)

      await expect(service.deleteRoom(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when room has active sessions', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.equipment.count.mockResolvedValue(0)
      mockPrisma.trainingSession.count.mockResolvedValue(2)

      await expect(service.deleteRoom(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('happy path: deletes room and calls audit.log', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.equipment.count.mockResolvedValue(0)
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.gymRoom.delete.mockResolvedValue(undefined)

      await service.deleteRoom(1n, 1n)

      expect(mockPrisma.gymRoom.delete).toHaveBeenCalledWith({ where: { roomId: 1n } })
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'room.delete' }))
    })
  })

  // -------------------------------------------------------------------------
  // createEquipment
  // -------------------------------------------------------------------------

  describe('createEquipment', () => {
    const dto = {
      roomId: '1',
      name: 'Treadmill',
      equipmentCode: 'EQ-000001',
      importDate: '2023-01-01',
      warrantyUntil: '2025-01-01',
    }

    it('throws BadRequestException when room does not exist', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(service.createEquipment(dto as any, 1n)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when importDate is in the future', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      const futureYear = new Date().getFullYear() + 1

      await expect(
        service.createEquipment({ ...dto, importDate: `${futureYear}-01-01` } as any, 1n)
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when warrantyUntil is before importDate', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())

      await expect(
        service.createEquipment(
          { ...dto, importDate: '2023-06-01', warrantyUntil: '2023-01-01' } as any,
          1n
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('happy path: creates equipment and calls audit.log', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      const equipment = makeEquipment()
      mockPrisma.equipment.create.mockResolvedValue(equipment)

      const result = await service.createEquipment(dto as any, 1n)

      expect(mockPrisma.equipment.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'equipment.create' })
      )
      expect(result.data.equipmentId).toBe('10')
    })
  })

  // -------------------------------------------------------------------------
  // updateEquipment
  // -------------------------------------------------------------------------

  describe('updateEquipment', () => {
    it('throws NotFoundException when equipment does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null)

      await expect(service.updateEquipment(999n, { name: 'X' } as any, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws BadRequestException when no fields provided', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())

      await expect(service.updateEquipment(10n, {} as any, 1n)).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when trying to set status=broken directly', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())

      await expect(service.updateEquipment(10n, { status: 'broken' } as any, 1n)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when trying to restore retired equipment', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment({ status: 'retired' }))

      await expect(service.updateEquipment(10n, { status: 'active' } as any, 1n)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when equipment has open maintenance and status changes', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment({ status: 'repairing' }))
      mockPrisma.maintenanceLog.count.mockResolvedValue(1)

      await expect(service.updateEquipment(10n, { status: 'active' } as any, 1n)).rejects.toThrow(
        ConflictException
      )
    })
  })

  // -------------------------------------------------------------------------
  // deleteEquipment
  // -------------------------------------------------------------------------

  describe('deleteEquipment', () => {
    it('throws NotFoundException when equipment does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null)

      await expect(service.deleteEquipment(999n, 1n, ['owner'])).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when force=true and caller is not owner', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)

      await expect(service.deleteEquipment(10n, 1n, ['staff'], true)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('throws ConflictException when equipment has open maintenance', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)

      await expect(service.deleteEquipment(10n, 1n, ['owner'])).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when has resolved logs and force=false', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2)

      await expect(service.deleteEquipment(10n, 1n, ['owner'], false)).rejects.toThrow(
        ConflictException
      )
    })

    it('owner force-deletes equipment with resolved maintenance history', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2)
      tx.maintenanceLog.deleteMany.mockResolvedValue({ count: 2 })
      tx.equipment.delete.mockResolvedValue(undefined)

      await service.deleteEquipment(10n, 1n, ['owner'], true)

      expect(tx.maintenanceLog.deleteMany).toHaveBeenCalled()
      expect(tx.equipment.delete).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'equipment.delete' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // createMaintenanceLog
  // -------------------------------------------------------------------------

  describe('createMaintenanceLog', () => {
    const dto = { description: 'Screen broken' }

    it('throws NotFoundException when equipment does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null)

      await expect(service.createMaintenanceLog(999n, dto as any, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when equipment is retired', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment({ status: 'retired' }))

      await expect(service.createMaintenanceLog(10n, dto as any, 1n)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when equipment already has open maintenance', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValue(1)

      await expect(service.createMaintenanceLog(10n, dto as any, 1n)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ForbiddenException when actor has no staff profile', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.createMaintenanceLog(10n, dto as any, 1n)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('happy path: creates log, sets active equipment to broken, calls audit', async () => {
      const equipment = makeEquipment({ status: 'active' })
      mockPrisma.equipment.findFirst.mockResolvedValue(equipment)
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      const log = makeMaintenanceLog()
      tx.maintenanceLog.create.mockResolvedValue(log)
      tx.equipment.update.mockResolvedValue({
        ...equipment,
        status: 'broken',
        room: equipment.room,
      })

      const result = await service.createMaintenanceLog(10n, dto as any, 100n)

      expect(tx.maintenanceLog.create).toHaveBeenCalled()
      expect(tx.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'broken' } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'maintenance.create' })
      )
      expect(result.data.maintenance.maintenanceId).toBe('100')
      expect(result.data.equipment.status).toBe('broken')
    })
  })

  // -------------------------------------------------------------------------
  // updateMaintenanceLog
  // -------------------------------------------------------------------------

  describe('updateMaintenanceLog', () => {
    it('throws NotFoundException when maintenance log does not exist', async () => {
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(null)

      await expect(
        service.updateMaintenanceLog(999n, { status: 'repairing' } as any, 1n)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when maintenance log is already closed (resolved)', async () => {
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(
        makeMaintenanceLog({
          status: 'resolved',
          equipment: makeEquipment(),
          reportedByStaff: { staffId: 5n, staffCode: 'ST-001', user: { fullName: 'Staff One' } },
        })
      )

      await expect(
        service.updateMaintenanceLog(100n, { status: 'repairing' } as any, 1n)
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException on invalid state transition (repairing→repairing)', async () => {
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(
        makeMaintenanceLog({
          status: 'repairing',
          equipment: makeEquipment({ status: 'repairing' }),
          reportedByStaff: { staffId: 5n, staffCode: 'ST-001', user: { fullName: 'Staff One' } },
        })
      )

      await expect(
        service.updateMaintenanceLog(100n, { status: 'repairing' } as any, 1n)
      ).rejects.toThrow(ConflictException)
    })

    it('happy path reported→repairing: updates log and sets equipment to repairing', async () => {
      const existing = makeMaintenanceLog({
        status: 'reported',
        equipment: makeEquipment({
          status: 'broken',
          room: { roomCode: 'RM-001', name: 'Main Hall' },
        }),
        reportedByStaff: { staffId: 5n, staffCode: 'ST-001', user: { fullName: 'Staff One' } },
      })
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(existing)

      const updatedLog = { ...existing, status: 'repairing' }
      const updatedEquipment = {
        ...makeEquipment(),
        status: 'repairing',
        room: { roomCode: 'RM-001', name: 'Main Hall' },
      }
      tx.maintenanceLog.update.mockResolvedValue(updatedLog)
      tx.equipment.update.mockResolvedValue(updatedEquipment)

      const result = await service.updateMaintenanceLog(100n, { status: 'repairing' } as any, 1n)

      expect(tx.maintenanceLog.update).toHaveBeenCalled()
      expect(tx.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'repairing' } })
      )
      expect(result.data.maintenance.status).toBe('repairing')
      expect(result.data.equipment.status).toBe('repairing')
    })

    it('repairing→resolved: sets equipment to active and sets resolvedAt', async () => {
      const existing = makeMaintenanceLog({
        status: 'repairing',
        equipment: makeEquipment({
          status: 'repairing',
          room: { roomCode: 'RM-001', name: 'Main Hall' },
        }),
        reportedByStaff: { staffId: 5n, staffCode: 'ST-001', user: { fullName: 'Staff One' } },
      })
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(existing)

      const updatedLog = { ...existing, status: 'resolved', resolvedAt: new Date() }
      const updatedEquipment = {
        ...makeEquipment(),
        status: 'active',
        room: { roomCode: 'RM-001', name: 'Main Hall' },
      }
      tx.maintenanceLog.update.mockResolvedValue(updatedLog)
      tx.equipment.update.mockResolvedValue(updatedEquipment)

      const result = await service.updateMaintenanceLog(100n, { status: 'resolved' } as any, 1n)

      expect(tx.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'active' } })
      )
      expect(result.data.equipment.status).toBe('active')
    })
  })

  // -------------------------------------------------------------------------
  // listEquipment (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('listEquipment', () => {
    it('returns paginated equipment list', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([makeEquipment()])
      mockPrisma.equipment.count.mockResolvedValue(1)

      const result = await service.listEquipment({ page: 1, pageSize: 20 } as any)

      expect(mockPrisma.equipment.findMany).toHaveBeenCalled()
      expect(result.data).toHaveLength(1)
      expect(result.meta.totalItems).toBe(1)
    })

    it('filters by roomId when provided', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([])
      mockPrisma.equipment.count.mockResolvedValue(0)

      await service.listEquipment({ roomId: 5 } as any)

      const callArg = (mockPrisma.equipment.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.roomId).toBe(BigInt(5))
    })

    it('filters by status when provided', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([])
      mockPrisma.equipment.count.mockResolvedValue(0)

      await service.listEquipment({ status: 'broken' } as any)

      const callArg = (mockPrisma.equipment.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.status).toBe('broken')
    })

    it('serializes equipmentId as string', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([makeEquipment({ equipmentId: 42n })])
      mockPrisma.equipment.count.mockResolvedValue(1)

      const result = await service.listEquipment({} as any)

      expect(typeof result.data[0].equipmentId).toBe('string')
      expect(result.data[0].equipmentId).toBe('42')
    })
  })

  // -------------------------------------------------------------------------
  // getEquipment (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('getEquipment', () => {
    it('throws NotFoundException when equipment does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null)

      await expect(service.getEquipment(999n)).rejects.toThrow(NotFoundException)
    })

    it('returns equipment detail with maintenance info', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)

      const result = await service.getEquipment(10n)

      expect(result.data.equipmentId).toBe('10')
      expect(result.data.openMaintenance).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // listMaintenanceLogs (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('listMaintenanceLogs', () => {
    it('throws NotFoundException when equipment does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null)

      await expect(service.listMaintenanceLogs(999n, {} as any)).rejects.toThrow(NotFoundException)
    })

    it('returns paginated maintenance logs', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.findMany.mockResolvedValue([makeMaintenanceLog()])
      mockPrisma.maintenanceLog.count.mockResolvedValue(1)

      const result = await service.listMaintenanceLogs(10n, { page: 1, pageSize: 20 } as any)

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalItems).toBe(1)
    })

    it('filters by status when provided', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.findMany.mockResolvedValue([])
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)

      await service.listMaintenanceLogs(10n, { status: 'resolved' } as any)

      const callArg = (mockPrisma.maintenanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.status).toBe('resolved')
    })
  })

  // -------------------------------------------------------------------------
  // updateEquipment — P2002 error path (Phase 10)
  // -------------------------------------------------------------------------

  describe('updateEquipment — P2002', () => {
    it('propagates P2002 for the global exception filter', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.maintenanceLog.count.mockResolvedValue(0)
      mockPrisma.equipment.update.mockRejectedValue({ code: 'P2002' })

      await expect(service.updateEquipment(10n, { name: 'New Name' } as any, 1n)).rejects.toEqual({
        code: 'P2002',
      })
    })
  })

  // -------------------------------------------------------------------------
  // createEquipment — P2002 (Phase 10 — branch coverage)
  // -------------------------------------------------------------------------

  describe('createEquipment — P2002', () => {
    it('propagates P2002 for the global exception filter', async () => {
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.equipment.create.mockRejectedValue({ code: 'P2002' })

      const dto = {
        roomId: '1',
        name: 'Treadmill',
        equipmentCode: 'EQ-001',
        importDate: '2023-01-01',
      }
      await expect(service.createEquipment(dto as any, 1n)).rejects.toEqual({ code: 'P2002' })
    })
  })

  // -------------------------------------------------------------------------
  // updateEquipment — roomId and date validation paths (Phase 10)
  // -------------------------------------------------------------------------

  describe('updateEquipment — roomId and date validation', () => {
    it('throws BadRequestException when new roomId does not exist', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)

      await expect(service.updateEquipment(10n, { roomId: '99' } as any, 1n)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws BadRequestException when importDate is in the future', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(makeEquipment())
      const futureYear = new Date().getFullYear() + 1

      await expect(
        service.updateEquipment(10n, { importDate: `${futureYear}-01-01` } as any, 1n)
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when warrantyUntil is before importDate', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(
        makeEquipment({ importDate: new Date('2023-01-01') })
      )

      await expect(
        service.updateEquipment(10n, { warrantyUntil: '2022-01-01' } as any, 1n)
      ).rejects.toThrow(BadRequestException)
    })
  })
})
