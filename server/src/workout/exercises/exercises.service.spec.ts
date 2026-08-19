import { ConflictException } from '@nestjs/common'
import { ExercisesService } from './exercises.service'

const exercise = {
  exerciseId: 1n,
  name: 'Push-up',
  category: 'strength',
  muscleGroup: null,
  equipmentNeeded: null,
  description: 'provider',
  gifUrl: null,
  source: 'manual',
  deletedAt: null,
}
describe('ExercisesService', () => {
  const prisma: any = {
    exercise: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    workoutPlanExercise: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  }
  const audit: any = { log: jest.fn() }
  const service = new ExercisesService(prisma, audit)
  beforeEach(() => jest.clearAllMocks())
  it('creates visible manual exercises', async () => {
    prisma.exercise.create.mockResolvedValue(exercise)
    await service.create(
      { name: 'Push-up', category: 'strength' } as any,
      { userId: 1n, staffId: 2n } as any
    )
    expect(prisma.exercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'manual', catalogVisible: true }),
      })
    )
  })
  it('rejects updates to provider records', async () => {
    prisma.exercise.findFirst.mockResolvedValue({ ...exercise, source: 'exercisedb' })
    await expect(
      service.update(1n, { name: 'Nope' } as any, { userId: 1n } as any)
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
