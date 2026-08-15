import { NotFoundException } from '@nestjs/common'
import { WorkoutLogsController } from './workout-logs.controller'
import { WorkoutLogsService } from './workout-logs.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'

const mockLogs = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
} as unknown as WorkoutLogsService

const ctrl = new WorkoutLogsController(mockLogs)

const user: AuthenticatedUser = {
  userId: BigInt(2),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(5),
}

beforeEach(() => jest.clearAllMocks())

describe('WorkoutLogsController', () => {
  describe('list', () => {
    it('delegates to findAll and wraps success', async () => {
      const data = [{ id: '1', loggedAt: '2026-01-01' }]
      ;(mockLogs.findAll as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.list(user)
      expect(mockLogs.findAll).toHaveBeenCalledWith(user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('create', () => {
    it('delegates to create and wraps success', async () => {
      const data = { id: '10', planId: '5' }
      ;(mockLogs.create as jest.Mock).mockResolvedValue(data)
      const dto = { planId: BigInt(5), loggedAt: '2026-06-14' } as any
      const res = await ctrl.create(dto, user)
      expect(mockLogs.create).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('update', () => {
    it('delegates to update with BigInt id and wraps success', async () => {
      const data = { id: '10', notes: 'Updated' }
      ;(mockLogs.update as jest.Mock).mockResolvedValue(data)
      const dto = { notes: 'Updated' } as any
      const res = await ctrl.update(10, dto, user)
      expect(mockLogs.update).toHaveBeenCalledWith(BigInt(10), dto, user)
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      ;(mockLogs.update as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.update(999, {} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
