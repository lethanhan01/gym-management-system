import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { WorkoutLogsService } from './workout-logs.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAssignment(overrides: object = {}) {
  return {
    assignmentId: 10n,
    memberId: 1n,
    planId: 5n,
    status: 'active',
    plan: { planId: 5n },
    ...overrides,
  }
}

function makePlanDay(overrides: object = {}) {
  return { planDayId: 20n, planId: 5n, ...overrides }
}

function makeLog(overrides: object = {}) {
  return {
    logId: 100n,
    memberId: 1n,
    assignmentId: 10n,
    planDayId: 20n,
    loggedAt: new Date(),
    durationMin: null,
    notes: null,
    planDay: {},
    sets: [],
    ...overrides,
  }
}

function makeUser(overrides: object = {}) {
  return { userId: 50n, roles: ['member'] as any[], memberId: 1n, ...overrides }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    workoutLog: {
      create: jest.fn().mockResolvedValue({ logId: 100n }),
      findUnique: jest.fn().mockResolvedValue(makeLog()),
    },
    workoutLogSet: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  }
}

const mockPrisma = {
  member: { findFirst: jest.fn() },
  memberWorkoutPlan: { findFirst: jest.fn() },
  workoutPlanDay: { findFirst: jest.fn() },
  workoutPlanExercise: { findMany: jest.fn() },
  workoutLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkoutLogsService', () => {
  let service: WorkoutLogsService
  let tx: ReturnType<typeof makeTx>

  beforeEach(() => {
    service = new WorkoutLogsService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    tx = makeTx()
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      typeof fn === 'function' ? fn(tx) : fn,
    )
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    const baseDto = {
      assignmentId: '10',
      planDayId: '20',
      loggedAt: new Date().toISOString(),
      sets: [],
    }

    it('throws ForbiddenException when caller has no member profile', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const user = { ...makeUser(), memberId: undefined }

      await expect(service.create(baseDto as any, user as any)).rejects.toThrow(ForbiddenException)
    })

    it('throws ForbiddenException when assignment does not belong to member', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(null)
      const user = makeUser()

      await expect(service.create(baseDto as any, user as any)).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when assignment is not active', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment({ status: 'completed' }))
      const user = makeUser()

      await expect(service.create(baseDto as any, user as any)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when planDay does not belong to assignment plan', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment())
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)
      const user = makeUser()

      await expect(service.create(baseDto as any, user as any)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when planExerciseId not in planDay', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment())
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(makePlanDay())
      // Only 1 planExercise returned for 2 requested
      mockPrisma.workoutPlanExercise.findMany.mockResolvedValue([{ planExerciseId: 1n, exercise: {} }])
      const user = makeUser()
      const dto = {
        ...baseDto,
        sets: [
          { planExerciseId: '1', setNumber: 1 },
          { planExerciseId: '2', setNumber: 2 },
        ],
      }

      await expect(service.create(dto as any, user as any)).rejects.toThrow(BadRequestException)
    })

    it('happy path with no sets: creates log and calls audit.log', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment())
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(makePlanDay())
      const user = makeUser()

      const result = await service.create(baseDto as any, user as any)

      expect(tx.workoutLog.create).toHaveBeenCalled()
      expect(tx.workoutLogSet.createMany).not.toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_log.create' }),
      )
      expect(result).toBeDefined()
    })

    it('happy path with sets: calls workoutLogSet.createMany', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment())
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(makePlanDay())
      mockPrisma.workoutPlanExercise.findMany.mockResolvedValue([{ planExerciseId: 1n, exercise: {} }])
      const user = makeUser()
      const dto = {
        ...baseDto,
        sets: [{ planExerciseId: '1', setNumber: 1, completed: true }],
      }

      await service.create(dto as any, user as any)

      expect(tx.workoutLogSet.createMany).toHaveBeenCalled()
    })

    it('uses memberId from JWT when available (no DB lookup)', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(makeAssignment())
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(makePlanDay())
      const user = makeUser({ memberId: 1n })

      await service.create(baseDto as any, user as any)

      expect(mockPrisma.member.findFirst).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('throws ForbiddenException when caller has no member profile', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const user = { ...makeUser(), memberId: undefined }

      await expect(service.findAll(user as any)).rejects.toThrow(ForbiddenException)
    })

    it('returns logs for the member', async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([makeLog()])
      const user = makeUser()

      const result = await service.findAll(user as any)

      expect(result).toHaveLength(1)
      const whereArg = mockPrisma.workoutLog.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(1n)
    })

    it('limits results to 50', async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([])
      const user = makeUser()

      await service.findAll(user as any)

      const takeArg = mockPrisma.workoutLog.findMany.mock.calls[0][0].take
      expect(takeArg).toBe(50)
    })
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('throws ForbiddenException when caller has no member profile', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const user = { ...makeUser(), memberId: undefined }

      await expect(service.update(100n, { notes: 'X' } as any, user as any)).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException when log does not exist', async () => {
      mockPrisma.workoutLog.findUnique.mockResolvedValue(null)
      const user = makeUser()

      await expect(service.update(999n, { notes: 'X' } as any, user as any)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when log belongs to different member', async () => {
      mockPrisma.workoutLog.findUnique.mockResolvedValue(makeLog({ memberId: 99n }))
      const user = makeUser({ memberId: 1n })

      await expect(service.update(100n, { notes: 'X' } as any, user as any)).rejects.toThrow(ForbiddenException)
    })

    it('throws ForbiddenException when log is older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)
      mockPrisma.workoutLog.findUnique.mockResolvedValue(makeLog({ loggedAt: oldDate }))
      const user = makeUser()

      await expect(service.update(100n, { notes: 'X' } as any, user as any)).rejects.toThrow(ForbiddenException)
    })

    it('happy path: updates notes and calls audit.log', async () => {
      const recentDate = new Date(Date.now() - 60 * 1000)
      mockPrisma.workoutLog.findUnique.mockResolvedValue(makeLog({ loggedAt: recentDate }))
      const updated = makeLog({ notes: 'Updated notes' })
      mockPrisma.workoutLog.update.mockResolvedValue(updated)
      const user = makeUser()

      const result = await service.update(100n, { notes: 'Updated notes' } as any, user as any)

      expect(mockPrisma.workoutLog.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_log.update' }),
      )
      expect(result.notes).toBe('Updated notes')
    })
  })
})
