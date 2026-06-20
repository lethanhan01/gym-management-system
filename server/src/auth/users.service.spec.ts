import { UsersService } from './users.service'

const mockPrisma = {
  user: { findFirst: jest.fn() },
}

const baseUser = {
  userId: 1n,
  email: 'owner@gym.local',
  passwordHash: 'hash',
  status: 'active',
  lineId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(() => {
    service = new UsersService(mockPrisma as any)
    jest.clearAllMocks()
  })

  describe('findByEmailWithRoles', () => {
    it('returns user with roles mapped from group names', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        groups: [{ group: { name: 'owner' } }, { group: { name: 'staff' } }],
      })

      const result = await service.findByEmailWithRoles('owner@gym.local')

      expect(result).not.toBeNull()
      expect(result!.email).toBe('owner@gym.local')
      expect(result!.roles).toEqual(['owner', 'staff'])
    })

    it('returns null when no user with that email exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      expect(await service.findByEmailWithRoles('nobody@gym.local')).toBeNull()
    })

    it('queries with email AND deletedAt: null to exclude soft-deleted users', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await service.findByEmailWithRoles('test@example.com')

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: 'test@example.com', deletedAt: null }),
        })
      )
    })

    it('returns empty roles array when user belongs to no groups', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, groups: [] })

      const result = await service.findByEmailWithRoles('owner@gym.local')

      expect(result!.roles).toEqual([])
    })

    it('does not expose groups field on returned object', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        groups: [{ group: { name: 'owner' } }],
      })

      const result = await service.findByEmailWithRoles('owner@gym.local')

      expect((result as any).groups).toBeUndefined()
    })

    it('includes group relation in Prisma query', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await service.findByEmailWithRoles('test@example.com')

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ groups: expect.anything() }),
        })
      )
    })
  })

  describe('findByLineIdWithRoles', () => {
    it('returns user with roles when found by lineId', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        lineId: 'U1234567890',
        groups: [{ group: { name: 'member' } }],
      })

      const result = await service.findByLineIdWithRoles('U1234567890')

      expect(result).not.toBeNull()
      expect(result!.roles).toEqual(['member'])
    })

    it('returns null when no user with that lineId exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      expect(await service.findByLineIdWithRoles('UNKNOWN')).toBeNull()
    })

    it('queries with lineId AND deletedAt: null', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await service.findByLineIdWithRoles('U999')

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lineId: 'U999', deletedAt: null }),
        })
      )
    })
  })

  describe('findByIdWithRoles', () => {
    it('returns user with roles and memberId when member record exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        groups: [{ group: { name: 'member' } }],
        member: { memberId: 42n },
      })

      const result = await service.findByIdWithRoles(1n)

      expect(result).not.toBeNull()
      expect(result!.roles).toEqual(['member'])
      expect(result!.memberId).toBe(42n)
    })

    it('returns null memberId when user has no Member record', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        groups: [{ group: { name: 'staff' } }],
        member: null,
      })

      const result = await service.findByIdWithRoles(1n)

      expect(result!.memberId).toBeNull()
    })

    it('returns null when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      expect(await service.findByIdWithRoles(999n)).toBeNull()
    })

    it('queries with userId AND deletedAt: null', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await service.findByIdWithRoles(5n)

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 5n, deletedAt: null }),
        })
      )
    })

    it('does not expose groups or member fields on returned object', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        groups: [{ group: { name: 'owner' } }],
        member: null,
      })

      const result = await service.findByIdWithRoles(1n)

      expect((result as any).groups).toBeUndefined()
      expect((result as any).member).toBeUndefined()
    })
  })
})
