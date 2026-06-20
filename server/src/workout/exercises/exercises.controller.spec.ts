import { NotFoundException } from '@nestjs/common'
import { ExercisesController } from './exercises.controller'
import { ExercisesService } from './exercises.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'

const mockExercises = {
  findAll: jest.fn(),
  create: jest.fn(),
  findFromExerciseDb: jest.fn(),
  importFromExerciseDb: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
} as unknown as ExercisesService

const ctrl = new ExercisesController(mockExercises)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'trainer@test.com',
  roles: ['trainer'],
}

beforeEach(() => jest.clearAllMocks())

describe('ExercisesController', () => {
  describe('list', () => {
    it('delegates to findAll and wraps success', async () => {
      const data = [{ id: '1', name: 'Push Up' }]
      ;(mockExercises.findAll as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.list('strength', 'chest')
      expect(mockExercises.findAll).toHaveBeenCalledWith({ category: 'strength', muscleGroup: 'chest' })
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('create', () => {
    it('delegates to create and wraps success', async () => {
      const data = { id: '10', name: 'Squat' }
      ;(mockExercises.create as jest.Mock).mockResolvedValue(data)
      const dto = { name: 'Squat', category: 'strength' } as any
      const res = await ctrl.create(dto, user)
      expect(mockExercises.create).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, data })
    })
  })

  describe('update', () => {
    it('delegates to update with BigInt id and wraps success', async () => {
      const data = { id: '5', name: 'Updated Squat' }
      ;(mockExercises.update as jest.Mock).mockResolvedValue(data)
      const dto = { name: 'Updated Squat' } as any
      const res = await ctrl.update(5, dto, user)
      expect(mockExercises.update).toHaveBeenCalledWith(BigInt(5), dto, user)
      expect(res).toEqual({ success: true, data })
    })

    it('propagates NotFoundException', async () => {
      (mockExercises.update as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.update(999, {} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('remove', () => {
    it('delegates to softDelete and returns success', async () => {
      (mockExercises.softDelete as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.remove(5, user)
      expect(mockExercises.softDelete).toHaveBeenCalledWith(BigInt(5), user)
      expect(res).toEqual({ success: true })
    })
  })

  describe('listExternal', () => {
    it('delegates to findFromExerciseDb and wraps success', async () => {
      const data = [{ id: 'ext-1', name: 'Bench Press' }]
      ;(mockExercises.findFromExerciseDb as jest.Mock).mockResolvedValue(data)
      const res = await ctrl.listExternal('strength', 'bench', '10', '0')
      expect(mockExercises.findFromExerciseDb).toHaveBeenCalledWith({
        category: 'strength',
        name: 'bench',
        limit: 10,
        offset: 0,
      })
      expect(res).toEqual({ success: true, data })
    })
  })
})
