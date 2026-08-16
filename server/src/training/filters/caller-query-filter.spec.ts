import { Prisma } from '@prisma/client'
import {
  AdminCallerQueryFilter,
  MemberCallerQueryFilter,
  resolveCallerFilter,
  TrainerCallerQueryFilter,
} from './caller-query-filter'

describe('caller-query-filter', () => {
  describe('MemberCallerQueryFilter', () => {
    it('applies memberId when present in caller', () => {
      const filter = new MemberCallerQueryFilter()
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 1n, roles: ['member'], memberId: 10n })
      expect(where.memberId).toBe(10n)
    })

    it('does not set memberId when caller.memberId is absent', () => {
      const filter = new MemberCallerQueryFilter()
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 1n, roles: ['member'] })
      expect(where.memberId).toBeUndefined()
    })
  })

  describe('TrainerCallerQueryFilter', () => {
    it('applies trainerStaffId from caller and requestedMemberId when provided', () => {
      const filter = new TrainerCallerQueryFilter(100n)
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 2n, roles: ['trainer'], staffId: 20n })
      expect(where.trainerStaffId).toBe(20n)
      expect(where.memberId).toBe(100n)
    })

    it('does not set trainerStaffId if caller.staffId is missing and no member requested', () => {
      const filter = new TrainerCallerQueryFilter()
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 2n, roles: ['trainer'] })
      expect(where.trainerStaffId).toBeUndefined()
      expect(where.memberId).toBeUndefined()
    })
  })

  describe('AdminCallerQueryFilter', () => {
    it('applies requested memberId and requested trainerStaffId', () => {
      const filter = new AdminCallerQueryFilter(10n, 20n)
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 1n, roles: ['owner'] })
      expect(where.memberId).toBe(10n)
      expect(where.trainerStaffId).toBe(20n)
    })

    it('does not set fields if requested filters are not provided', () => {
      const filter = new AdminCallerQueryFilter()
      const where: Prisma.TrainingSessionWhereInput = {}
      filter.apply(where, { userId: 1n, roles: ['owner'] })
      expect(where.memberId).toBeUndefined()
      expect(where.trainerStaffId).toBeUndefined()
    })
  })

  describe('resolveCallerFilter', () => {
    it('returns MemberCallerQueryFilter for member-only caller', () => {
      const filter = resolveCallerFilter({ userId: 1n, roles: ['member'] })
      expect(filter).toBeInstanceOf(MemberCallerQueryFilter)
    })

    it('returns TrainerCallerQueryFilter for trainer-only caller', () => {
      const filter = resolveCallerFilter({ userId: 2n, roles: ['trainer'] }, '55')
      expect(filter).toBeInstanceOf(TrainerCallerQueryFilter)
    })

    it('returns AdminCallerQueryFilter for owner/staff or mixed roles', () => {
      const ownerFilter = resolveCallerFilter(
        { userId: 3n, roles: ['owner', 'trainer'] },
        '55',
        '66'
      )
      expect(ownerFilter).toBeInstanceOf(AdminCallerQueryFilter)

      const staffFilter = resolveCallerFilter(
        { userId: 4n, roles: ['staff'] },
        '55',
        '66'
      )
      expect(staffFilter).toBeInstanceOf(AdminCallerQueryFilter)
    })
  })
})
