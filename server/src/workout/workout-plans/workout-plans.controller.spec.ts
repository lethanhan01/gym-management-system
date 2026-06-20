import { NotFoundException } from '@nestjs/common'
import { WorkoutPlansController } from './workout-plans.controller'
import { WorkoutPlansService } from './workout-plans.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'

const mockPlans = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  addDay: jest.fn(),
  updateDay: jest.fn(),
  deleteDay: jest.fn(),
  addExercise: jest.fn(),
  removePlanExercise: jest.fn(),
  updatePlanExercise: jest.fn(),
  listAssignments: jest.fn(),
  assignPlan: jest.fn(),
  findSuggested: jest.fn(),
  findOne: jest.fn(),
} as unknown as WorkoutPlansService

const ctrl = new WorkoutPlansController(mockPlans)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'trainer@test.com',
  roles: ['trainer'],
}

beforeEach(() => jest.clearAllMocks())

describe('WorkoutPlansController', () => {
  describe('list', () => {
    it('delegates to findAll and wraps success', async () => {
      const data = [{ id: '1', name: 'Plan A' }]
      ;(mockPlans.findAll as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.list(user)
      expect(mockPlans.findAll).toHaveBeenCalledWith(user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('create', () => {
    it('delegates to create and wraps success', async () => {
      const data = { id: '10', name: 'New Plan' }
      ;(mockPlans.create as jest.Mock).mockResolvedValue(data)
      const dto = { name: 'New Plan', goal: 'strength' } as any
      const res = await ctrl.create(dto, user)
      expect(mockPlans.create).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('update', () => {
    it('delegates to update with BigInt id and wraps success', async () => {
      const data = { id: '5', name: 'Updated Plan' }
      ;(mockPlans.update as jest.Mock).mockResolvedValue(data)
      const dto = { name: 'Updated Plan' } as any
      const res = await ctrl.update(5, dto, user)
      expect(mockPlans.update).toHaveBeenCalledWith(BigInt(5), dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('remove', () => {
    it('delegates to softDelete and returns success', async () => {
      (mockPlans.softDelete as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.remove(5, user)
      expect(mockPlans.softDelete).toHaveBeenCalledWith(BigInt(5), user)
      expect(res).toEqual({ success: true })
    })
  })

  describe('addDay', () => {
    it('delegates to addDay with BigInt plan id and wraps success', async () => {
      const data = { id: '20', dayLabel: 'Ngày 1' }
      ;(mockPlans.addDay as jest.Mock).mockResolvedValue(data)
      const dto = { dayLabel: 'Ngày 1' } as any
      const res = await ctrl.addDay(5, dto, user)
      expect(mockPlans.addDay).toHaveBeenCalledWith(BigInt(5), dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('addExercise', () => {
    it('delegates to addExercise with BigInt ids and wraps success', async () => {
      const data = { id: '30', exerciseId: '1', sets: 3 }
      ;(mockPlans.addExercise as jest.Mock).mockResolvedValue(data)
      const dto = { exerciseId: BigInt(1), sets: 3 } as any
      const res = await ctrl.addExercise(5, 20, dto, user)
      expect(mockPlans.addExercise).toHaveBeenCalledWith(BigInt(5), BigInt(20), dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('assign', () => {
    it('delegates to assignPlan and wraps success', async () => {
      const data = { id: '40', memberId: '10', planId: '5' }
      ;(mockPlans.assignPlan as jest.Mock).mockResolvedValue(data)
      const dto = { planId: 5 } as any
      const res = await ctrl.assign(10, dto, user)
      expect(mockPlans.assignPlan).toHaveBeenCalledWith(BigInt(10), dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('findOne', () => {
    it('delegates to findOne and wraps success', async () => {
      const data = { id: '5', name: 'Plan A', days: [] }
      ;(mockPlans.findOne as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.findOne(5)
      expect(mockPlans.findOne).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      (mockPlans.findOne as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.findOne(999)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
