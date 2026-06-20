import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { PlanCreatorType, WorkoutAssignmentStatus, WorkoutPlanStatus } from '@prisma/client'
import { WorkoutPlansService } from './workout-plans.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlan(overrides: object = {}) {
  return {
    planId: 1n,
    name: 'My Plan',
    description: null,
    creatorType: PlanCreatorType.staff,
    creatorStaffId: 5n,
    creatorMemberId: null,
    status: WorkoutPlanStatus.draft,
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    days: [],
    ...overrides,
  }
}

function makeDay(overrides: object = {}) {
  return { planDayId: 10n, planId: 1n, dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: 'Day 1', notes: null, exercises: [], ...overrides }
}

function makeOwner() {
  return { userId: 1n, roles: ['owner'] as any[], staffId: undefined, memberId: undefined }
}

function makeMember(memberId = 2n) {
  return { userId: 10n, roles: ['member'] as any[], staffId: undefined, memberId }
}

function makeStaff(staffId = 5n) {
  return { userId: 20n, roles: ['staff'] as any[], staffId, memberId: undefined }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
    memberWorkoutPlan: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ assignmentId: 100n, memberId: 2n, planId: 1n, assignedByStaffId: null, startDate: new Date(), status: 'active', endedAt: null, notes: null, createdAt: new Date() }),
    },
  }
}

const mockPrisma = {
  workoutPlan: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  workoutPlanDay: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  workoutPlanExercise: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  workoutLog: {
    findFirst: jest.fn(),
  },
  memberWorkoutPlan: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
  },
  exercise: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkoutPlansService', () => {
  let service: WorkoutPlansService
  let tx: ReturnType<typeof makeTx>

  beforeEach(() => {
    service = new WorkoutPlansService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    tx = makeTx()
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      typeof fn === 'function' ? fn(tx) : fn,
    )
    mockPrisma.workoutLog.findFirst.mockResolvedValue(null)
  })

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('owner sees all plans without restriction', async () => {
      mockPrisma.workoutPlan.findMany.mockResolvedValue([makePlan()])
      const caller = makeOwner()

      await service.findAll(caller as any)

      const whereArg = mockPrisma.workoutPlan.findMany.mock.calls[0][0].where
      expect(whereArg.creatorMemberId).toBeUndefined()
      expect(whereArg.creatorStaffId).toBeUndefined()
    })

    it('member sees only their own plans', async () => {
      mockPrisma.workoutPlan.findMany.mockResolvedValue([])
      const caller = makeMember(2n)

      await service.findAll(caller as any)

      const whereArg = mockPrisma.workoutPlan.findMany.mock.calls[0][0].where
      expect(whereArg.creatorMemberId).toBe(2n)
    })

    it('member without memberId in JWT resolves via DB lookup', async () => {
      mockPrisma.workoutPlan.findMany.mockResolvedValue([])
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 3n })
      const caller = { ...makeMember(), memberId: undefined }

      await service.findAll(caller as any)

      const whereArg = mockPrisma.workoutPlan.findMany.mock.calls[0][0].where
      expect(whereArg.creatorMemberId).toBe(3n)
    })

    it('member with no member record throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = { ...makeMember(), memberId: undefined }

      await expect(service.findAll(caller as any)).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('throws NotFoundException when plan does not exist', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(null)

      await expect(service.findOne(999n)).rejects.toThrow(NotFoundException)
    })

    it('returns plan when found', async () => {
      const plan = makePlan()
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(plan)

      const result = await service.findOne(1n)

      expect(result.planId).toBe(1n)
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('creates plan with creatorType=staff for staff caller', async () => {
      const plan = makePlan({ creatorType: PlanCreatorType.staff })
      mockPrisma.workoutPlan.create.mockResolvedValue(plan)
      const caller = makeStaff()

      await service.create({ name: 'Plan A' } as any, caller as any)

      const dataArg = mockPrisma.workoutPlan.create.mock.calls[0][0].data
      expect(dataArg.creatorType).toBe(PlanCreatorType.staff)
      expect(dataArg.creatorMemberId).toBeNull()
    })

    it('creates plan with creatorType=member for member caller', async () => {
      const plan = makePlan({ creatorType: PlanCreatorType.member, creatorMemberId: 2n })
      mockPrisma.workoutPlan.create.mockResolvedValue(plan)
      const caller = makeMember(2n)

      await service.create({ name: 'My Personal Plan' } as any, caller as any)

      const dataArg = mockPrisma.workoutPlan.create.mock.calls[0][0].data
      expect(dataArg.creatorType).toBe(PlanCreatorType.member)
      expect(dataArg.creatorStaffId).toBeNull()
    })

    it('throws ForbiddenException when member has no member record', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = { ...makeMember(), memberId: undefined }

      await expect(service.create({ name: 'X' } as any, caller as any)).rejects.toThrow(ForbiddenException)
    })

    it('sets status=draft on create', async () => {
      const plan = makePlan()
      mockPrisma.workoutPlan.create.mockResolvedValue(plan)
      const caller = makeStaff()

      await service.create({ name: 'Draft Plan' } as any, caller as any)

      const dataArg = mockPrisma.workoutPlan.create.mock.calls[0][0].data
      expect(dataArg.status).toBe(WorkoutPlanStatus.draft)
    })
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('throws NotFoundException when plan does not exist', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(service.update(999n, {} as any, caller as any)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException PLAN_WRITE_BLOCKED when plan has workout logs', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan())
      mockPrisma.workoutLog.findFirst.mockResolvedValue({ logId: 1n })
      const caller = makeOwner()

      await expect(
        service.update(1n, { name: 'X' } as any, caller as any),
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException on draft→active with empty days', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ status: WorkoutPlanStatus.draft }))
      mockPrisma.workoutPlanDay.findMany.mockResolvedValue([])
      const caller = makeOwner()

      await expect(
        service.update(1n, { status: WorkoutPlanStatus.active } as any, caller as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException on active→draft (invalid transition)', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ status: WorkoutPlanStatus.active }))
      const caller = makeOwner()

      await expect(
        service.update(1n, { status: WorkoutPlanStatus.draft } as any, caller as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException on active→archived when active assignment exists', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ status: WorkoutPlanStatus.active }))
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 1n })
      const caller = makeOwner()

      await expect(
        service.update(1n, { status: WorkoutPlanStatus.archived } as any, caller as any),
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException when trying to update archived plan', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ status: WorkoutPlanStatus.archived }))
      const caller = makeOwner()

      await expect(
        service.update(1n, { name: 'X' } as any, caller as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('happy path: updates name and calls audit.log', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan())
      const updated = makePlan({ name: 'Updated Plan' })
      mockPrisma.workoutPlan.update.mockResolvedValue(updated)
      const caller = makeOwner()

      const result = await service.update(1n, { name: 'Updated Plan' } as any, caller as any)

      expect(mockPrisma.workoutPlan.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' }),
      )
      expect(result.name).toBe('Updated Plan')
    })
  })

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------

  describe('softDelete', () => {
    it('throws NotFoundException when plan does not exist', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(service.softDelete(999n, caller as any)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException for staff plan with active assignment', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ creatorType: PlanCreatorType.staff }))
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 1n })
      const caller = makeOwner()

      await expect(service.softDelete(1n, caller as any)).rejects.toThrow(ConflictException)
    })

    it('member plan: auto-ends active assignments and deletes plan', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(
        makePlan({ creatorType: PlanCreatorType.member, creatorMemberId: 2n }),
      )
      const deleted = makePlan({ deletedAt: new Date() })
      mockPrisma.workoutPlan.update.mockResolvedValue(deleted)
      mockPrisma.memberWorkoutPlan.updateMany.mockResolvedValue({ count: 1 })
      const caller = makeMember(2n)

      await service.softDelete(1n, caller as any)

      expect(mockPrisma.memberWorkoutPlan.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: WorkoutAssignmentStatus.replaced }) }),
      )
      expect(mockPrisma.workoutPlan.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.delete' }),
      )
    })
  })

  // -------------------------------------------------------------------------
  // addDay
  // -------------------------------------------------------------------------

  describe('addDay', () => {
    it('throws NotFoundException when plan does not exist', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.addDay(999n, { dayNumber: 1, name: 'Day 1' } as any, caller as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when plan is archived', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan({ status: WorkoutPlanStatus.archived }))
      const caller = makeOwner()

      await expect(
        service.addDay(1n, { dayNumber: 1, name: 'Day 1' } as any, caller as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when plan has logs (write-blocked)', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan())
      mockPrisma.workoutLog.findFirst.mockResolvedValue({ logId: 1n })
      const caller = makeOwner()

      await expect(
        service.addDay(1n, { dayNumber: 1, name: 'Day 1' } as any, caller as any),
      ).rejects.toThrow(ConflictException)
    })

    it('propagates P2002 error from prisma on duplicate dayNumber', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan())
      mockPrisma.workoutPlanDay.create.mockRejectedValue({ code: 'P2002' })
      const caller = makeOwner()

      await expect(
        service.addDay(1n, { dayNumber: 1, name: 'Day 1' } as any, caller as any),
      ).rejects.toMatchObject({ code: 'P2002' })
    })

    it('happy path: creates day and calls audit.log', async () => {
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(makePlan())
      mockPrisma.workoutPlanDay.create.mockResolvedValue(makeDay())
      const caller = makeOwner()

      const result = await service.addDay(1n, { dayNumber: 1, name: 'Day 1' } as any, caller as any)

      expect(mockPrisma.workoutPlanDay.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' }),
      )
      expect(result.planDayId).toBe(10n)
    })
  })

  // -------------------------------------------------------------------------
  // assignPlan
  // -------------------------------------------------------------------------

  describe('assignPlan', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.assignPlan(99n, { planId: '1', startDate: '2024-06-01' } as any, caller as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when plan does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: null })
      mockPrisma.workoutPlan.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.assignPlan(2n, { planId: '999', startDate: '2024-06-01' } as any, caller as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when plan is not active', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: null })
      mockPrisma.workoutPlan.findFirst.mockResolvedValue({ planId: 1n, status: WorkoutPlanStatus.draft })
      const caller = makeOwner()

      await expect(
        service.assignPlan(2n, { planId: '1', startDate: '2024-06-01' } as any, caller as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ForbiddenException when trainer is not assigned to member', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: 99n })
      mockPrisma.workoutPlan.findFirst.mockResolvedValue({ planId: 1n, status: WorkoutPlanStatus.active })
      mockPrisma.workoutPlanDay.count.mockResolvedValue(2)
      mockPrisma.workoutPlanExercise.count.mockResolvedValue(4)
      const caller = { ...makeStaff(5n), roles: ['trainer'] as any[] }

      await expect(
        service.assignPlan(2n, { planId: '1', startDate: '2024-06-01' } as any, caller as any),
      ).rejects.toThrow(ForbiddenException)
    })

    it('happy path: owner assigns plan, creates assignment', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: null })
      mockPrisma.workoutPlan.findFirst.mockResolvedValue({ planId: 1n, status: WorkoutPlanStatus.active })
      mockPrisma.workoutPlanDay.count.mockResolvedValue(2)
      mockPrisma.workoutPlanExercise.count.mockResolvedValue(4)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      const result = await service.assignPlan(2n, { planId: '1', startDate: '2024-06-01' } as any, caller as any)

      expect(tx.$queryRaw).toHaveBeenCalled()
      expect(String((tx.$queryRaw as jest.Mock).mock.calls[0][0])).not.toContain(
        'assigned_by_staff_id'
      )
      expect(tx.memberWorkoutPlan.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.assign' }),
      )
      expect(result.status).toBe('active')
    })

    it('replaces every active assignment for the member before creating a new one', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: null })
      mockPrisma.workoutPlan.findFirst.mockResolvedValue({
        planId: 1n,
        status: WorkoutPlanStatus.active,
      })
      mockPrisma.workoutPlanDay.count.mockResolvedValue(2)
      mockPrisma.workoutPlanExercise.count.mockResolvedValue(4)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      tx.$queryRaw.mockResolvedValueOnce([{ assignmentId: 10n }, { assignmentId: 11n }])
      const caller = makeOwner()

      await service.assignPlan(
        2n,
        { planId: '1', startDate: '2024-06-01' } as any,
        caller as any
      )

      expect(tx.memberWorkoutPlan.updateMany).toHaveBeenCalledWith({
        where: { assignmentId: { in: [10n, 11n] } },
        data: {
          status: WorkoutAssignmentStatus.replaced,
          endedAt: expect.any(Date),
        },
      })
      expect(tx.memberWorkoutPlan.create).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // findAll — trainer path (Phase 10 — branch coverage)
  // -------------------------------------------------------------------------

  describe('findAll — trainer path', () => {
    it('trainer with staffId: filters plans by creatorStaffId', async () => {
      mockPrisma.workoutPlan.findMany.mockResolvedValue([makePlan()])
      const caller = { ...makeStaff(5n), roles: ['trainer'] as any[] }

      await service.findAll(caller as any)

      const callArg = (mockPrisma.workoutPlan.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.creatorStaffId).toBe(5n)
    })

    it('trainer without staffId: throws ForbiddenException', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = { ...makeStaff(5n), roles: ['trainer'] as any[], staffId: undefined }

      await expect(service.findAll(caller as any)).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // assignPlan — member-caller path (Phase 10 — branch coverage)
  // -------------------------------------------------------------------------

  describe('assignPlan — member path', () => {
    it('member caller trying to assign plan to another member: throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n, primaryTrainerId: null })
      mockPrisma.member.findFirst.mockResolvedValueOnce({ memberId: 2n, primaryTrainerId: null })
      const caller = makeMember(99n)

      await expect(
        service.assignPlan(2n, { planId: '1', startDate: '2024-06-01' } as any, caller as any)
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // updatePlanExercise (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('updatePlanExercise', () => {
    const planExercise = {
      planExerciseId: 50n, planDayId: 10n, exerciseId: 1n,
      orderIndex: 1, targetSets: 3, targetReps: null, targetDurationSec: null,
      targetWeightKg: null, restSeconds: 60, notes: null,
      planDay: { ...makeDay(), plan: makePlan() },
      exercise: { exerciseId: 1n, name: 'Push-up' },
    }

    it('throws NotFoundException when plan exercise does not exist', async () => {
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.updatePlanExercise(1n, 10n, 50n, { targetSets: 4 } as any, caller as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('happy path: updates exercise and logs audit', async () => {
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(planExercise)
      const updated = { ...planExercise, targetSets: 4 }
      mockPrisma.workoutPlanExercise.update.mockResolvedValue(updated)
      const caller = makeOwner()

      const result = await service.updatePlanExercise(1n, 10n, 50n, { targetSets: 4 } as any, caller as any)

      expect(mockPrisma.workoutPlanExercise.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' })
      )
      expect(result.planExerciseId).toBe(50n)
    })
  })

  // -------------------------------------------------------------------------
  // listAssignments (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('listAssignments', () => {
    it('owner: returns assignments for given member', async () => {
      const assignment = {
        assignmentId: 100n, memberId: 2n, planId: 1n, assignedByStaffId: null,
        startDate: new Date(), status: 'active', endedAt: null, notes: null, createdAt: new Date(),
        plan: { planId: 1n, name: 'My Plan', description: null, status: WorkoutPlanStatus.active, days: [] },
      }
      mockPrisma.memberWorkoutPlan.findMany.mockResolvedValue([assignment])
      const caller = makeOwner()

      const result = await service.listAssignments(2n, {}, caller as any)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].assignmentId).toBe('100')
      expect(result.data[0].planId).toBe('1')
    })

    it('member only: throws ForbiddenException when viewing other member assignments', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 2n })
      const caller = makeMember(2n)

      await expect(
        service.listAssignments(999n, {}, caller as any)
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // findSuggested (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('findSuggested', () => {
    it('returns active staff-created plans', async () => {
      const plan = makePlan({ status: WorkoutPlanStatus.active })
      mockPrisma.workoutPlan.findMany.mockResolvedValue([plan])

      const result = await service.findSuggested()

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].planId).toBe(1n)
      const callArg = (mockPrisma.workoutPlan.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.creatorType).toBe(PlanCreatorType.staff)
    })
  })

  // -------------------------------------------------------------------------
  // updateDay (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('updateDay', () => {
    const dayWithPlan = { ...makeDay(), plan: makePlan() }

    it('throws NotFoundException when day does not exist', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.updateDay(1n, 10n, { name: 'Day 1' } as any, caller as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when plan has logs (write-blocked)', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      mockPrisma.workoutLog.findFirst.mockResolvedValue({ logId: 1n })
      const caller = makeOwner()

      await expect(
        service.updateDay(1n, 10n, { name: 'Day 1' } as any, caller as any)
      ).rejects.toThrow(ConflictException)
    })

    it('happy path: updates day and logs audit', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      const updatedDay = { ...makeDay(), name: 'Updated Day' }
      mockPrisma.workoutPlanDay.update.mockResolvedValue(updatedDay)
      const caller = makeOwner()

      const result = await service.updateDay(1n, 10n, { name: 'Updated Day' } as any, caller as any)

      expect(mockPrisma.workoutPlanDay.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' })
      )
      expect(result.name).toBe('Updated Day')
    })
  })

  // -------------------------------------------------------------------------
  // deleteDay (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('deleteDay', () => {
    const dayWithPlan = { ...makeDay(), plan: makePlan() }

    it('throws NotFoundException when day does not exist', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(service.deleteDay(1n, 10n, caller as any)).rejects.toThrow(NotFoundException)
    })

    it('happy path: deletes day and logs audit', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      mockPrisma.workoutPlanDay.delete.mockResolvedValue(dayWithPlan)
      const caller = makeOwner()

      await service.deleteDay(1n, 10n, caller as any)

      expect(mockPrisma.workoutPlanDay.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { planDayId: 10n } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // addExercise (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('addExercise', () => {
    const dayWithPlan = { ...makeDay(), plan: makePlan() }

    it('throws NotFoundException when day does not exist', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.addExercise(1n, 10n, { exerciseId: '1', orderIndex: 1, targetSets: 3 } as any, caller as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when exercise does not exist', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      mockPrisma.exercise.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.addExercise(1n, 10n, { exerciseId: '999', orderIndex: 1, targetSets: 3 } as any, caller as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('propagates P2002 error from prisma on duplicate orderIndex', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      mockPrisma.exercise.findFirst.mockResolvedValue({ exerciseId: 1n })
      mockPrisma.workoutPlanExercise.create.mockRejectedValue({ code: 'P2002' })
      const caller = makeOwner()

      await expect(
        service.addExercise(1n, 10n, { exerciseId: '1', orderIndex: 1, targetSets: 3 } as any, caller as any)
      ).rejects.toMatchObject({ code: 'P2002' })
    })

    it('happy path: creates exercise and logs audit', async () => {
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(dayWithPlan)
      mockPrisma.exercise.findFirst.mockResolvedValue({ exerciseId: 1n })
      const created = {
        planExerciseId: 50n, planDayId: 10n, exerciseId: 1n, orderIndex: 1, targetSets: 3,
        targetReps: null, targetDurationSec: null, targetWeightKg: null, restSeconds: 60, notes: null,
        exercise: { exerciseId: 1n, name: 'Push-up' },
      }
      mockPrisma.workoutPlanExercise.create.mockResolvedValue(created)
      const caller = makeOwner()

      const result = await service.addExercise(1n, 10n, { exerciseId: '1', orderIndex: 1, targetSets: 3 } as any, caller as any)

      expect(result.planExerciseId).toBe(50n)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // removePlanExercise (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('removePlanExercise', () => {
    const planExercise = {
      planExerciseId: 50n, planDayId: 10n, exerciseId: 1n,
      planDay: { ...makeDay(), plan: makePlan() },
    }

    it('throws NotFoundException when plan exercise does not exist', async () => {
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(null)
      const caller = makeOwner()

      await expect(
        service.removePlanExercise(1n, 10n, 50n, caller as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException on P2003 (referenced by workout log)', async () => {
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(planExercise)
      mockPrisma.workoutPlanExercise.delete.mockRejectedValue({ code: 'P2003' })
      const caller = makeOwner()

      await expect(
        service.removePlanExercise(1n, 10n, 50n, caller as any)
      ).rejects.toThrow(ConflictException)
    })

    it('happy path: deletes exercise and logs audit', async () => {
      mockPrisma.workoutPlanExercise.findFirst.mockResolvedValue(planExercise)
      mockPrisma.workoutPlanExercise.delete.mockResolvedValue(planExercise)
      const caller = makeOwner()

      await service.removePlanExercise(1n, 10n, 50n, caller as any)

      expect(mockPrisma.workoutPlanExercise.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { planExerciseId: 50n } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'workout_plan.update' })
      )
    })
  })
})
