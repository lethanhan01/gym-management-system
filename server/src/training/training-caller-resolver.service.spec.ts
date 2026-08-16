import { ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'

describe('TrainingCallerResolverService', () => {
  let service: TrainingCallerResolverService
  let mockPrisma: {
    staff: { findFirst: jest.Mock }
    member: { findFirst: jest.Mock }
  }

  beforeEach(() => {
    mockPrisma = {
      staff: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
    }
    service = new TrainingCallerResolverService(mockPrisma as unknown as PrismaService)
  })

  describe('resolveStaffId', () => {
    it('returns caller.staffId directly if available', async () => {
      const res = await service.resolveStaffId({ userId: 1n, roles: ['trainer'], staffId: 99n })
      expect(res).toBe(99n)
      expect(mockPrisma.staff.findFirst).not.toHaveBeenCalled()
    })

    it('queries prisma staff when caller.staffId is undefined', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 88n })
      const res = await service.resolveStaffId({ userId: 1n, roles: ['trainer'] })
      expect(res).toBe(88n)
      expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
        where: { userId: 1n, deletedAt: null },
        select: { staffId: true },
      })
    })

    it('returns null when staff is not found in database', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const res = await service.resolveStaffId({ userId: 1n, roles: ['trainer'] })
      expect(res).toBeNull()
    })
  })

  describe('resolveMemberId', () => {
    it('returns caller.memberId directly if available', async () => {
      const res = await service.resolveMemberId({ userId: 1n, roles: ['member'], memberId: 77n })
      expect(res).toBe(77n)
      expect(mockPrisma.member.findFirst).not.toHaveBeenCalled()
    })

    it('queries prisma member when caller.memberId is undefined', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 66n })
      const res = await service.resolveMemberId({ userId: 1n, roles: ['member'] })
      expect(res).toBe(66n)
      expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
        where: { userId: 1n, deletedAt: null },
        select: { memberId: true },
      })
    })

    it('returns null when member is not found in database', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const res = await service.resolveMemberId({ userId: 1n, roles: ['member'] })
      expect(res).toBeNull()
    })
  })

  describe('role helpers', () => {
    it('identifies owner or staff correctly', () => {
      expect(service.isOwnerOrStaff({ userId: 1n, roles: ['owner'] })).toBe(true)
      expect(service.isOwnerOrStaff({ userId: 1n, roles: ['staff'] })).toBe(true)
      expect(service.isOwnerOrStaff({ userId: 1n, roles: ['trainer'] })).toBe(false)
    })

    it('identifies trainer only correctly', () => {
      expect(service.isTrainerOnly({ userId: 1n, roles: ['trainer'] })).toBe(true)
      expect(service.isTrainerOnly({ userId: 1n, roles: ['trainer', 'owner'] })).toBe(false)
      expect(service.isTrainerOnly({ userId: 1n, roles: ['member'] })).toBe(false)
    })

    it('identifies member only correctly', () => {
      expect(service.isMemberOnly({ userId: 1n, roles: ['member'] })).toBe(true)
      expect(service.isMemberOnly({ userId: 1n, roles: ['member', 'trainer'] })).toBe(false)
      expect(service.isMemberOnly({ userId: 1n, roles: ['member', 'staff'] })).toBe(false)
    })
  })

  describe('checkSessionAccess', () => {
    const session = { memberId: 10n, trainerStaffId: 20n }

    it('allows access for owner/staff', () => {
      expect(() =>
        service.checkSessionAccess(session, { userId: 1n, roles: ['owner'] })
      ).not.toThrow()
    })

    it('allows access for assigned trainer', () => {
      expect(() =>
        service.checkSessionAccess(session, { userId: 2n, roles: ['trainer'], staffId: 20n })
      ).not.toThrow()
    })

    it('throws ForbiddenException for unassigned trainer', () => {
      expect(() =>
        service.checkSessionAccess(session, { userId: 2n, roles: ['trainer'], staffId: 99n })
      ).toThrow(ForbiddenException)
    })

    it('allows access for session member', () => {
      expect(() =>
        service.checkSessionAccess(session, { userId: 3n, roles: ['member'], memberId: 10n })
      ).not.toThrow()
    })

    it('throws ForbiddenException for different member', () => {
      expect(() =>
        service.checkSessionAccess(session, { userId: 3n, roles: ['member'], memberId: 88n })
      ).toThrow(ForbiddenException)
    })
  })
})
