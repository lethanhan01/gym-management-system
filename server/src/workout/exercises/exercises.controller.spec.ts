import { ExercisesController } from './exercises.controller'

const exercises = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn(), clearOverrides: jest.fn() } as any
const user = { userId: 1n, email: 'trainer@test.com', roles: ['trainer'] } as any
describe('ExercisesController', () => {
  const controller = new ExercisesController(exercises)
  beforeEach(() => jest.clearAllMocks())
  it('returns paginated catalog data', async () => {
    exercises.findAll.mockResolvedValue({ data: [{ name: 'Squat' }], meta: { page: 1 } })
    await expect(controller.list({ q: 'squat', page: '1' })).resolves.toEqual({ success: true, data: [{ name: 'Squat' }], meta: { page: 1 } })
    expect(exercises.findAll).toHaveBeenCalledWith(expect.objectContaining({ q: 'squat', page: 1 }))
  })
  it('clears provider overrides by internal ID', async () => {
    exercises.clearOverrides.mockResolvedValue({ exerciseId: 5n })
    await controller.clearOverrides(5, user)
    expect(exercises.clearOverrides).toHaveBeenCalledWith(5n, user)
  })
})
