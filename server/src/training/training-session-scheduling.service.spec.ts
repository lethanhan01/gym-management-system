import { BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'

describe('TrainingSessionSchedulingService', () => {
  let service: TrainingSessionSchedulingService
  let mockPrisma: {
    gymRoom: { findMany: jest.Mock }
    trainingSession: { findMany: jest.Mock; findFirst: jest.Mock }
    memberWorkoutPlan: { findFirst: jest.Mock }
    workoutPlanDay: { findFirst: jest.Mock }
  }

  const start = new Date('2026-08-20T10:00:00Z')
  const end = new Date('2026-08-20T11:00:00Z')

  beforeEach(() => {
    mockPrisma = {
      gymRoom: { findMany: jest.fn() },
      trainingSession: { findMany: jest.fn(), findFirst: jest.fn() },
      memberWorkoutPlan: { findFirst: jest.fn() },
      workoutPlanDay: { findFirst: jest.fn() },
    }
    service = new TrainingSessionSchedulingService(mockPrisma as unknown as PrismaService)
  })

  describe('findAvailableRoom', () => {
    it('returns null when no gym rooms exist', async () => {
      mockPrisma.gymRoom.findMany.mockResolvedValue([])
      const res = await service.findAvailableRoom(start, end)
      expect(res).toBeNull()
    })

    it('returns first available room when some rooms are busy', async () => {
      mockPrisma.gymRoom.findMany.mockResolvedValue([
        { roomId: 1n, name: 'Room 1' },
        { roomId: 2n, name: 'Room 2' },
      ])
      mockPrisma.trainingSession.findMany.mockResolvedValue([{ roomId: 1n }])

      const res = await service.findAvailableRoom(start, end)
      expect(res).toEqual({ roomId: 2n, name: 'Room 2' })
    })

    it('returns null when all rooms are busy', async () => {
      mockPrisma.gymRoom.findMany.mockResolvedValue([{ roomId: 1n, name: 'Room 1' }])
      mockPrisma.trainingSession.findMany.mockResolvedValue([{ roomId: 1n }])

      const res = await service.findAvailableRoom(start, end)
      expect(res).toBeNull()
    })
  })

  describe('resolveSessionPlanLink', () => {
    it('returns null when neither plan nor day is provided and not required', async () => {
      const res = await service.resolveSessionPlanLink(undefined, undefined, 10n, false)
      expect(res).toBeNull()
    })

    it('throws BadRequestException when required and no plan/day provided', async () => {
      await expect(
        service.resolveSessionPlanLink(undefined, undefined, 10n, true)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_PLAN_REQUIRED' }),
      })
    })

    it('throws BadRequestException when only assignmentId is provided', async () => {
      await expect(
        service.resolveSessionPlanLink('1', undefined, 10n, false)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_PLAN_LINK_INCOMPLETE' }),
      })
    })

    it('throws BadRequestException on invalid bigint string', async () => {
      await expect(
        service.resolveSessionPlanLink('invalid', '2', 10n, false)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws BadRequestException when assignment is not active or not for member', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(null)
      await expect(
        service.resolveSessionPlanLink('1', '2', 10n, false)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_ASSIGNMENT_INVALID' }),
      })
    })

    it('throws BadRequestException when plan day is not part of assignment plan', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 1n, planId: 5n })
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)

      await expect(
        service.resolveSessionPlanLink('1', '2', 10n, false)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_PLAN_DAY_INVALID' }),
      })
    })

    it('successfully returns resolved bigint ids', async () => {
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 1n, planId: 5n })
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue({ planDayId: 2n })

      const res = await service.resolveSessionPlanLink('1', '2', 10n, false)
      expect(res).toEqual({ assignmentId: 1n, planDayId: 2n })
    })
  })

  describe('checkOverlap', () => {
    it('does nothing when no overlapping session is found', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      await expect(
        service.checkOverlap(1n, null, start, end, 'ROOM_TIME_OVERLAP')
      ).resolves.toBeUndefined()
    })

    it('throws ConflictException with room message when ROOM_TIME_OVERLAP occurs', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        startTime: start,
        endTime: end,
        room: { name: 'Cardio Room' },
      })

      await expect(
        service.checkOverlap(1n, null, start, end, 'ROOM_TIME_OVERLAP', 99n)
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'ROOM_TIME_OVERLAP',
          message: expect.stringContaining('Cardio Room'),
        }),
      })
    })

    it('throws ConflictException with member message when MEMBER_TIME_OVERLAP occurs', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        startTime: start,
        endTime: end,
        member: { user: { fullName: 'Member Alice' } },
      })

      await expect(
        service.checkOverlap(null, null, start, end, 'MEMBER_TIME_OVERLAP', undefined, 10n)
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'MEMBER_TIME_OVERLAP',
        }),
      })
    })

    it('throws ConflictException with trainer message when TRAINER_TIME_OVERLAP occurs', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        startTime: start,
        endTime: end,
        trainer: { user: { fullName: 'Trainer Bob' } },
      })

      await expect(
        service.checkOverlap(null, 5n, start, end, 'TRAINER_TIME_OVERLAP')
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TRAINER_TIME_OVERLAP',
          message: expect.stringContaining('Trainer Bob'),
        }),
      })
    })
  })
})
