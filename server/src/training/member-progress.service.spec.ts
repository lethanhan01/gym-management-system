import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { MemberProgressService } from './member-progress.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingCaller } from './training.types'

describe('MemberProgressService', () => {
  let service: MemberProgressService
  let mockPrisma: {
    member: { findFirst: jest.Mock }
    memberProgress: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  }
  let mockAudit: { log: jest.Mock }
  let mockCallerResolver: {
    resolveStaffId: jest.Mock
    resolveMemberId: jest.Mock
    isOwnerOrStaff: jest.Mock
    isTrainerOnly: jest.Mock
    isMemberOnly: jest.Mock
  }

  const makeCaller = (overrides: Partial<TrainingCaller> = {}): TrainingCaller => ({
    userId: 1n,
    roles: ['owner'],
    ...overrides,
  })

  beforeEach(() => {
    mockPrisma = {
      member: { findFirst: jest.fn() },
      memberProgress: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }
    mockAudit = { log: jest.fn() }
    mockCallerResolver = {
      resolveStaffId: jest.fn(),
      resolveMemberId: jest.fn(),
      isOwnerOrStaff: jest.fn().mockReturnValue(true),
      isTrainerOnly: jest.fn().mockReturnValue(false),
      isMemberOnly: jest.fn().mockReturnValue(false),
    }

    service = new MemberProgressService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockCallerResolver as unknown as TrainingCallerResolverService
    )
  })

  describe('listProgress', () => {
    it('throws ForbiddenException when member caller attempts to view other member progress', async () => {
      mockCallerResolver.isMemberOnly.mockReturnValue(true)
      mockCallerResolver.isOwnerOrStaff.mockReturnValue(false)
      mockCallerResolver.resolveMemberId.mockResolvedValue(10n)

      await expect(
        service.listProgress(99n, {}, makeCaller({ roles: ['member'], memberId: 10n }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ForbiddenException when trainer is not primary trainer of member', async () => {
      mockCallerResolver.isMemberOnly.mockReturnValue(false)
      mockCallerResolver.isTrainerOnly.mockReturnValue(true)
      mockCallerResolver.isOwnerOrStaff.mockReturnValue(false)
      mockCallerResolver.resolveStaffId.mockResolvedValue(20n)
      mockPrisma.member.findFirst.mockResolvedValue({ primaryTrainerId: 99n })

      await expect(
        service.listProgress(10n, {}, makeCaller({ roles: ['trainer'], staffId: 20n }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('returns serialized records with date range filters and default limit', async () => {
      mockCallerResolver.isOwnerOrStaff.mockReturnValue(true)
      mockPrisma.memberProgress.findMany.mockResolvedValue([
        {
          progressId: 1n,
          memberId: 10n,
          staffId: 20n,
          weight: new Prisma.Decimal(70.5),
          height: new Prisma.Decimal(175),
          bmi: new Prisma.Decimal(23.0),
          goal: 'Weight Loss',
          notes: 'Good progress',
          recordedAt: new Date('2026-08-01T00:00:00Z'),
        },
      ])

      const result = await service.listProgress(
        10n,
        { from: '2026-08-01', to: '2026-08-10', limit: '20' },
        makeCaller()
      )

      expect(result.data).toHaveLength(1)
      expect(result.data[0].progressId).toBe('1')
      expect(result.data[0].weight).toBe(70.5)
      expect(mockPrisma.memberProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })
  })

  describe('recordProgress', () => {
    it('throws NotFoundException if member is not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      await expect(
        service.recordProgress(10n, { weight: 70 }, makeCaller())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException if member tries to record for another member', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 20n })
      mockCallerResolver.isMemberOnly.mockReturnValue(true)
      mockCallerResolver.resolveMemberId.mockResolvedValue(99n)

      await expect(
        service.recordProgress(10n, { weight: 70 }, makeCaller({ roles: ['member'] }))
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ForbiddenException if trainer is not assigned to member', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 20n })
      mockCallerResolver.isTrainerOnly.mockReturnValue(true)
      mockCallerResolver.resolveStaffId.mockResolvedValue(99n)

      await expect(
        service.recordProgress(10n, { weight: 70 }, makeCaller({ roles: ['trainer'] }))
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TRAINER_NOT_ASSIGNED' }),
      })
    })

    it('throws BadRequestException when recordedAt is too far in future', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 20n })
      mockCallerResolver.resolveStaffId.mockResolvedValue(20n)

      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      await expect(
        service.recordProgress(10n, { recordedAt: futureDate }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws BadRequestException when caller has no valid staff profile', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 20n })
      mockCallerResolver.resolveStaffId.mockResolvedValue(null)

      await expect(
        service.recordProgress(10n, { weight: 70 }, makeCaller())
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('successfully creates progress record and logs audit', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 20n })
      mockCallerResolver.resolveStaffId.mockResolvedValue(20n)
      mockPrisma.memberProgress.create.mockResolvedValue({
        progressId: 1n,
        memberId: 10n,
        staffId: 20n,
        weight: new Prisma.Decimal(70),
        height: null,
        bmi: new Prisma.Decimal(22.5),
        goal: 'Fit',
        notes: 'Great session',
        recordedAt: new Date(),
      })

      const res = await service.recordProgress(
        10n,
        { weight: 70, bmi: 22.5, goal: 'Fit', notes: 'Great session' },
        makeCaller()
      )

      expect(res.data.progressId).toBe('1')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'progress.record',
          resourceId: '1',
        })
      )
    })
  })

  describe('deleteProgress', () => {
    it('throws NotFoundException when progress record is not found', async () => {
      mockPrisma.memberProgress.findFirst.mockResolvedValue(null)
      await expect(service.deleteProgress(1n, makeCaller())).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when caller is not owner/staff and not the creator', async () => {
      mockPrisma.memberProgress.findFirst.mockResolvedValue({ progressId: 1n, staffId: 20n })
      mockCallerResolver.isOwnerOrStaff.mockReturnValue(false)
      mockCallerResolver.resolveStaffId.mockResolvedValue(99n)

      await expect(service.deleteProgress(1n, makeCaller())).rejects.toThrow(ForbiddenException)
    })

    it('successfully soft deletes progress record and logs audit', async () => {
      mockPrisma.memberProgress.findFirst.mockResolvedValue({ progressId: 1n, staffId: 20n })
      mockCallerResolver.isOwnerOrStaff.mockReturnValue(true)

      await service.deleteProgress(1n, makeCaller())

      expect(mockPrisma.memberProgress.update).toHaveBeenCalledWith({
        where: { progressId: 1n },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'progress.delete',
          resourceId: '1',
        })
      )
    })
  })
})
