jest.mock('https')
import * as https from 'https'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { ExercisesService } from './exercises.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExercise(overrides: object = {}) {
  return {
    exerciseId: 1n,
    name: 'Push-up',
    category: 'strength' as any,
    muscleGroup: 'chest',
    equipmentNeeded: 'Bodyweight',
    description: null,
    imageUrl: null,
    createdByStaffId: null,
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  }
}

function makeUser(overrides: object = {}) {
  return { userId: 100n, roles: ['staff'] as any[], staffId: 5n, ...overrides }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  exercise: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  workoutPlanExercise: {
    findFirst: jest.fn(),
  },
}

const mockAudit = { log: jest.fn() }
const mockConfig = { get: jest.fn() }

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ExercisesService', () => {
  let service: ExercisesService

  beforeEach(() => {
    service = new ExercisesService(mockPrisma as any, mockAudit as any, mockConfig as any)
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('returns all non-deleted exercises when no filters provided', async () => {
      mockPrisma.exercise.findMany.mockResolvedValue([makeExercise()])

      const result = await service.findAll({})

      expect(result).toHaveLength(1)
      const whereArg = mockPrisma.exercise.findMany.mock.calls[0][0].where
      expect(whereArg.deletedAt).toBeNull()
      expect(whereArg.category).toBeUndefined()
      expect(whereArg.muscleGroup).toBeUndefined()
    })

    it('applies category filter when provided', async () => {
      mockPrisma.exercise.findMany.mockResolvedValue([])

      await service.findAll({ category: 'cardio' })

      const whereArg = mockPrisma.exercise.findMany.mock.calls[0][0].where
      expect(whereArg.category).toBe('cardio')
    })

    it('applies case-insensitive muscleGroup contains filter when provided', async () => {
      mockPrisma.exercise.findMany.mockResolvedValue([])

      await service.findAll({ muscleGroup: 'chest' })

      const whereArg = mockPrisma.exercise.findMany.mock.calls[0][0].where
      expect(whereArg.muscleGroup).toEqual({ contains: 'chest', mode: 'insensitive' })
    })

    it('applies both filters when both provided', async () => {
      mockPrisma.exercise.findMany.mockResolvedValue([])

      await service.findAll({ category: 'strength', muscleGroup: 'chest' })

      const whereArg = mockPrisma.exercise.findMany.mock.calls[0][0].where
      expect(whereArg.category).toBe('strength')
      expect(whereArg.muscleGroup).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('creates exercise and calls audit.log with action exercise.create', async () => {
      const exercise = makeExercise()
      mockPrisma.exercise.create.mockResolvedValue(exercise)
      const user = makeUser()

      const result = await service.create(
        { name: 'Push-up', category: 'strength' as any } as any,
        user as any,
      )

      expect(mockPrisma.exercise.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'exercise.create', actorUserId: user.userId }),
      )
      expect(result.exerciseId).toBe(1n)
    })

    it('passes staffId as createdByStaffId', async () => {
      const exercise = makeExercise({ createdByStaffId: 5n })
      mockPrisma.exercise.create.mockResolvedValue(exercise)
      const user = makeUser({ staffId: 5n })

      await service.create({ name: 'Push-up', category: 'strength' as any } as any, user as any)

      const dataArg = mockPrisma.exercise.create.mock.calls[0][0].data
      expect(dataArg.createdByStaffId).toBe(5n)
    })

    it('uses null for createdByStaffId when user has no staffId', async () => {
      const exercise = makeExercise()
      mockPrisma.exercise.create.mockResolvedValue(exercise)
      const user = makeUser({ staffId: undefined })

      await service.create({ name: 'Push-up', category: 'strength' as any } as any, user as any)

      const dataArg = mockPrisma.exercise.create.mock.calls[0][0].data
      expect(dataArg.createdByStaffId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('throws NotFoundException when exercise does not exist', async () => {
      mockPrisma.exercise.findFirst.mockResolvedValue(null)
      const user = makeUser()

      await expect(
        service.update(999n, { name: 'X' } as any, user as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('happy path: updates exercise and calls audit.log with exercise.update', async () => {
      const before = makeExercise()
      const updated = makeExercise({ name: 'Diamond Push-up' })
      mockPrisma.exercise.findFirst.mockResolvedValue(before)
      mockPrisma.exercise.update.mockResolvedValue(updated)
      const user = makeUser()

      const result = await service.update(1n, { name: 'Diamond Push-up' } as any, user as any)

      expect(mockPrisma.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { exerciseId: 1n } }),
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'exercise.update' }),
      )
      expect(result.name).toBe('Diamond Push-up')
    })
  })

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------

  describe('softDelete', () => {
    it('throws NotFoundException when exercise does not exist', async () => {
      mockPrisma.exercise.findFirst.mockResolvedValue(null)
      const user = makeUser()

      await expect(service.softDelete(999n, user as any)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when exercise is used in an active plan', async () => {
      mockPrisma.exercise.findFirst.mockResolvedValue(makeExercise())
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue({ planExerciseId: 99n })
      const user = makeUser()

      await expect(service.softDelete(1n, user as any)).rejects.toThrow(ConflictException)
    })

    it('happy path: soft-deletes exercise and calls audit.log with exercise.delete', async () => {
      const exercise = makeExercise()
      mockPrisma.exercise.findFirst.mockResolvedValue(exercise)
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(null)
      mockPrisma.exercise.update.mockResolvedValue({ ...exercise, deletedAt: new Date() })
      const user = makeUser()

      await service.softDelete(1n, user as any)

      expect(mockPrisma.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { exerciseId: 1n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'exercise.delete' }),
      )
    })
  })

  // -------------------------------------------------------------------------
  // importFromExerciseDb
  // -------------------------------------------------------------------------

  describe('importFromExerciseDb', () => {
    it('returns existing exercise when name already exists (idempotent)', async () => {
      const existing = makeExercise()
      mockPrisma.exercise.findFirst.mockResolvedValue(existing)

      const result = await service.importFromExerciseDb({ name: 'Push-up', category: 'strength' })

      expect(mockPrisma.exercise.create).not.toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it('creates new exercise when name does not exist', async () => {
      mockPrisma.exercise.findFirst.mockResolvedValue(null)
      const newExercise = makeExercise({ name: 'Squat', muscleGroup: 'legs' })
      mockPrisma.exercise.create.mockResolvedValue(newExercise)

      const result = await service.importFromExerciseDb({ name: 'Squat', category: 'strength' })

      expect(mockPrisma.exercise.create).toHaveBeenCalled()
      expect(result.name).toBe('Squat')
    })
  })

  // -------------------------------------------------------------------------
  // findFromExerciseDb — API key absent
  // -------------------------------------------------------------------------

  describe('findFromExerciseDb (no API key)', () => {
    it('falls back to local findAll when EXERCISEDB_API_KEY is not set', async () => {
      mockConfig.get.mockReturnValue(null)
      mockPrisma.exercise.findMany.mockResolvedValue([makeExercise()])

      const result = await service.findFromExerciseDb({ category: 'strength' })

      expect(mockPrisma.exercise.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // findFromExerciseDb — with API key (mocked https)
  // -------------------------------------------------------------------------

  describe('findFromExerciseDb (with API key)', () => {
    const apiExercise = {
      id: 'ext-001',
      name: 'Bench Press',
      bodyPart: 'chest',
      target: 'pectorals',
      secondaryMuscles: ['triceps'],
      equipment: 'barbell',
      gifUrl: 'https://example.com/bench.gif',
      instructions: ['Lie down', 'Press up'],
    }

    function setupHttpsGetSuccess(responseData: unknown) {
      const mockGet = https.get as jest.Mock
      mockGet.mockImplementation((_url: unknown, _opts: unknown, cb: (res: unknown) => void) => {
        const mockRes = {
          on: jest.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
            if (event === 'data') handler(JSON.stringify(responseData))
            if (event === 'end') handler()
            return mockRes
          }),
        }
        cb(mockRes)
        return { on: jest.fn().mockReturnThis() }
      })
    }

    function setupHttpsGetError() {
      const mockGet = https.get as jest.Mock
      const mockReq = {
        on: jest.fn().mockImplementation((event: string, handler: (err: Error) => void) => {
          if (event === 'error') handler(new Error('network error'))
          return mockReq
        }),
      }
      mockGet.mockImplementation(() => mockReq)
    }

    beforeEach(() => {
      mockConfig.get.mockReturnValue('test-api-key-12345')
    })

    it('returns mapped exercises on successful API response', async () => {
      setupHttpsGetSuccess([apiExercise])

      const result = await service.findFromExerciseDb({ category: 'strength' })

      expect(Array.isArray(result)).toBe(true)
      expect((result as any[])[0].name).toBe('Bench Press')
      expect((result as any[])[0].muscleGroup).toContain('pectorals')
    })

    it('constructs name-search URL when name filter is provided', async () => {
      setupHttpsGetSuccess([apiExercise])
      const mockGet = https.get as jest.Mock

      await service.findFromExerciseDb({ name: 'bench' })

      const calledUrl = mockGet.mock.calls[0][0] as string
      expect(calledUrl).toContain('/exercises/name/')
    })

    it('constructs cardio URL when category is cardio', async () => {
      setupHttpsGetSuccess([apiExercise])
      const mockGet = https.get as jest.Mock

      await service.findFromExerciseDb({ category: 'cardio' })

      const calledUrl = mockGet.mock.calls[0][0] as string
      expect(calledUrl).toContain('/exercises/bodyPart/cardio')
    })

    it('falls back to local when API returns non-array (rate-limit)', async () => {
      setupHttpsGetSuccess({ message: 'too many requests' })
      mockPrisma.exercise.findMany.mockResolvedValue([makeExercise()])

      const result = await service.findFromExerciseDb({ category: 'strength' })

      expect(mockPrisma.exercise.findMany).toHaveBeenCalled()
      expect(Array.isArray(result)).toBe(true)
    })

    it('falls back to local on network error', async () => {
      setupHttpsGetError()
      mockPrisma.exercise.findMany.mockResolvedValue([makeExercise()])

      const result = await service.findFromExerciseDb({ category: 'strength' })

      expect(mockPrisma.exercise.findMany).toHaveBeenCalled()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
