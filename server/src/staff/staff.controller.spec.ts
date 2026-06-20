import { BadRequestException, NotFoundException } from '@nestjs/common'
import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  get: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  listTrainers: jest.fn(),
  listAllSchedules: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  listSchedules: jest.fn(),
  createSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  attendanceCheckIn: jest.fn(),
  attendanceCheckOut: jest.fn(),
  getMyAttendance: jest.fn(),
} as unknown as StaffService

const ctrl = new StaffController(mockService)

const ownerUser: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'owner@test.com',
  roles: ['owner'],
}

const staffUser: AuthenticatedUser = {
  userId: BigInt(5),
  email: 'staff@test.com',
  roles: ['staff'],
  staffId: BigInt(3),
}

beforeEach(() => jest.clearAllMocks())

describe('StaffController', () => {
  describe('getMe', () => {
    it('delegates to get with user.staffId', async () => {
      const data = { id: '3', code: 'S001' }
      ;(mockService.get as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.getMe(staffUser)
      expect(mockService.get).toHaveBeenCalledWith(staffUser.staffId)
      expect(res).toEqual({ success: true, data })
    })

    it('throws BadRequestException when user has no staffId', async () => {
      await expect(ctrl.getMe(ownerUser)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockService.get).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('delegates to list and wraps success', async () => {
      const data = [{ id: '1' }, { id: '2' }]
      ;(mockService.list as jest.Mock).mockResolvedValue(data)
      const query = { role: 'trainer' } as any
      const res = await ctrl.list(query, ownerUser)
      expect(mockService.list).toHaveBeenCalledWith(query, ownerUser)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('create', () => {
    it('delegates to create and wraps success', async () => {
      const data = { id: '10', code: 'S010' }
      ;(mockService.create as jest.Mock).mockResolvedValue(data)
      const dto = { fullName: 'New Staff', email: 'ns@test.com', role: 'trainer' } as any
      const res = await ctrl.create(dto, ownerUser)
      expect(mockService.create).toHaveBeenCalledWith(dto, ownerUser.userId)
      expect(res).toEqual({ success: true, data })
    })

    it('propagates exception', async () => {
      const { ConflictException } = await import('@nestjs/common')
      ;(mockService.create as jest.Mock).mockRejectedValue(new ConflictException())
      await expect(ctrl.create({} as any, ownerUser)).rejects.toBeInstanceOf(ConflictException)
    })
  })

  describe('listTrainers', () => {
    it('delegates to listTrainers and wraps success', async () => {
      const data = [{ id: '3', role: 'trainer' }]
      ;(mockService.listTrainers as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.listTrainers()
      expect(mockService.listTrainers).toHaveBeenCalled()
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('listAllSchedules', () => {
    it('delegates the requested date range and wraps success', async () => {
      const data = [{ scheduleId: '1' }]
      ;(mockService.listAllSchedules as jest.Mock).mockResolvedValue(data)

      const res = await ctrl.listAllSchedules('2026-06-01', '2026-06-30')

      expect(mockService.listAllSchedules).toHaveBeenCalledWith('2026-06-01', '2026-06-30')
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('self attendance', () => {
    it('delegates check-in with staffId from the authenticated user', async () => {
      const data = { logId: '1', checkOut: null }
      ;(mockService.attendanceCheckIn as jest.Mock).mockResolvedValue(data)

      const res = await ctrl.attendanceCheckIn(staffUser)

      expect(mockService.attendanceCheckIn).toHaveBeenCalledWith(3n)
      expect(res).toEqual({ success: true, data })
    })

    it('rejects check-in when the authenticated user has no staff profile', async () => {
      await expect(ctrl.attendanceCheckIn(ownerUser)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STAFF_PROFILE_MISSING' }),
      })
      expect(mockService.attendanceCheckIn).not.toHaveBeenCalled()
    })

    it('delegates check-out with staffId from the authenticated user', async () => {
      const data = { logId: '1', checkOut: '2026-06-19T03:00:00.000Z' }
      ;(mockService.attendanceCheckOut as jest.Mock).mockResolvedValue(data)

      const res = await ctrl.attendanceCheckOut(staffUser)

      expect(mockService.attendanceCheckOut).toHaveBeenCalledWith(3n)
      expect(res).toEqual({ success: true, data })
    })

    it('rejects check-out when the authenticated user has no staff profile', async () => {
      await expect(ctrl.attendanceCheckOut(ownerUser)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockService.attendanceCheckOut).not.toHaveBeenCalled()
    })

    it('delegates attendance history filters with staffId from the authenticated user', async () => {
      const data = { data: [], total: 0 }
      const query = { from: '2026-06-01', to: '2026-06-30', pageSize: 50 }
      ;(mockService.getMyAttendance as jest.Mock).mockResolvedValue(data)

      const res = await ctrl.getMyAttendance(staffUser, query)

      expect(mockService.getMyAttendance).toHaveBeenCalledWith(3n, query)
      expect(res).toEqual({ success: true, data })
    })

    it('rejects attendance history when the authenticated user has no staff profile', async () => {
      await expect(ctrl.getMyAttendance(ownerUser, {})).rejects.toBeInstanceOf(BadRequestException)
      expect(mockService.getMyAttendance).not.toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('delegates to get with BigInt id and wraps success', async () => {
      const data = { id: '7', code: 'S007' }
      ;(mockService.get as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.get(7)
      expect(mockService.get).toHaveBeenCalledWith(BigInt(7))
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      (mockService.get as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.get(999)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('update', () => {
    it('delegates to update and wraps success', async () => {
      const data = { id: '7', phone: '0912345678' }
      ;(mockService.update as jest.Mock).mockResolvedValue(data)
      const dto = { phone: '0912345678' } as any
      const res = await ctrl.update(7, dto, ownerUser)
      expect(mockService.update).toHaveBeenCalledWith(BigInt(7), dto, ownerUser.userId)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('remove', () => {
    it('delegates to delete and wraps success', async () => {
      const data = { deleted: true }
      ;(mockService.delete as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.remove(7, ownerUser)
      expect(mockService.delete).toHaveBeenCalledWith(BigInt(7), ownerUser.userId)
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      (mockService.delete as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.remove(999, ownerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('listSchedules', () => {
    it('delegates to listSchedules with BigInt id', async () => {
      const data = [{ id: '1', dayOfWeek: 'monday' }]
      ;(mockService.listSchedules as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.listSchedules(7)
      expect(mockService.listSchedules).toHaveBeenCalledWith(BigInt(7))
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('createSchedule', () => {
    it('delegates to createSchedule and wraps success', async () => {
      const data = { id: '20', dayOfWeek: 'tuesday' }
      ;(mockService.createSchedule as jest.Mock).mockResolvedValue(data)
      const dto = { dayOfWeek: 'tuesday', startTime: '09:00', endTime: '12:00' } as any
      const res = await ctrl.createSchedule(7, dto, ownerUser)
      expect(mockService.createSchedule).toHaveBeenCalledWith(BigInt(7), dto, ownerUser.userId)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('deleteSchedule', () => {
    it('delegates to deleteSchedule with both BigInt ids', async () => {
      const data = { deleted: true }
      ;(mockService.deleteSchedule as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.deleteSchedule(7, 20, ownerUser)
      expect(mockService.deleteSchedule).toHaveBeenCalledWith(
        BigInt(7),
        BigInt(20),
        ownerUser.userId
      )
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      (mockService.deleteSchedule as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.deleteSchedule(7, 999, ownerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
