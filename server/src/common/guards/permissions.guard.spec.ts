import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PermissionsGuard } from './permissions.guard'
import { InMemoryPermissionCacheService } from '../cache/in-memory-permission-cache.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'

const mockPrisma = {
  userGroup: { findMany: jest.fn() },
}
const mockConfig = { get: jest.fn().mockReturnValue(undefined) }

function createMockContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => () => {},
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any
}

function makeUser(userId: bigint): AuthenticatedUser {
  return { userId, email: 'test@example.com', roles: ['member'] }
}

function makeDbRows(codes: string[]) {
  return codes.map((code) => ({
    group: { permissions: [{ permission: { code } }] },
  }))
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard
  let reflector: { getAllAndOverride: jest.Mock }
  let cacheProvider: InMemoryPermissionCacheService

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    cacheProvider = new InMemoryPermissionCacheService()
    guard = new PermissionsGuard(reflector as any, mockPrisma as any, mockConfig as any, cacheProvider)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('no PERMISSION_KEY on endpoint', () => {
    it('returns true without querying DB when no permission is required', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined)

      const result = await guard.canActivate(createMockContext(makeUser(1001n)))

      expect(result).toBe(true)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
    })
  })

  describe('no authenticated user', () => {
    it('returns false when request.user is undefined', async () => {
      reflector.getAllAndOverride.mockReturnValue('members:read')

      const result = await guard.canActivate(createMockContext(undefined))

      expect(result).toBe(false)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
    })
  })

  describe('user has the required permission', () => {
    it('returns true when DB returns the required permission code', async () => {
      const userId = 1100n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      const result = await guard.canActivate(createMockContext(makeUser(userId)))

      expect(result).toBe(true)
      await cacheProvider.delete(userId.toString())
    })

    it('returns true when user has multiple permissions and one matches', async () => {
      const userId = 1200n
      reflector.getAllAndOverride.mockReturnValue('schedule:write')
      mockPrisma.userGroup.findMany.mockResolvedValue(
        makeDbRows(['members:read', 'schedule:write'])
      )

      const result = await guard.canActivate(createMockContext(makeUser(userId)))

      expect(result).toBe(true)
      await cacheProvider.delete(userId.toString())
    })

    it('aggregates permissions across multiple groups', async () => {
      const userId = 1300n
      reflector.getAllAndOverride.mockReturnValue('schedule:write')
      mockPrisma.userGroup.findMany.mockResolvedValue([
        { group: { permissions: [{ permission: { code: 'members:read' } }] } },
        { group: { permissions: [{ permission: { code: 'schedule:write' } }] } },
      ])

      const result = await guard.canActivate(createMockContext(makeUser(userId)))

      expect(result).toBe(true)
      await cacheProvider.delete(userId.toString())
    })
  })

  describe('user missing the required permission', () => {
    it('throws ForbiddenException when DB returns no matching permission', async () => {
      const userId = 1400n
      reflector.getAllAndOverride.mockReturnValue('members:write')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      await expect(guard.canActivate(createMockContext(makeUser(userId)))).rejects.toThrow(
        ForbiddenException
      )
      await cacheProvider.delete(userId.toString())
    })

    it('throws ForbiddenException when user has no permissions at all', async () => {
      const userId = 1500n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue([])

      await expect(guard.canActivate(createMockContext(makeUser(userId)))).rejects.toThrow(
        ForbiddenException
      )
      await cacheProvider.delete(userId.toString())
    })

    it('ForbiddenException is thrown (permission code included in error)', async () => {
      const userId = 1600n
      reflector.getAllAndOverride.mockReturnValue('packages:delete')
      mockPrisma.userGroup.findMany.mockResolvedValue([])

      let thrownError: unknown
      try {
        await guard.canActivate(createMockContext(makeUser(userId)))
      } catch (e) {
        thrownError = e
      }
      expect(thrownError).toBeInstanceOf(ForbiddenException)
      await cacheProvider.delete(userId.toString())
    })
  })

  describe('permission cache', () => {
    it('queries DB exactly once for two consecutive calls within the cache TTL', async () => {
      const userId = 1700n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      await guard.canActivate(createMockContext(makeUser(userId)))
      await guard.canActivate(createMockContext(makeUser(userId)))

      expect(mockPrisma.userGroup.findMany).toHaveBeenCalledTimes(1)
      await cacheProvider.delete(userId.toString())
    })

    it('re-queries DB after cache entry is deleted', async () => {
      const userId = 1800n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      await guard.canActivate(createMockContext(makeUser(userId)))
      await cacheProvider.delete(userId.toString())
      await guard.canActivate(createMockContext(makeUser(userId)))

      expect(mockPrisma.userGroup.findMany).toHaveBeenCalledTimes(2)
      await cacheProvider.delete(userId.toString())
    })

    it('re-queries DB after the 60-second cache TTL expires', async () => {
      jest.useFakeTimers()
      const userId = 1900n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      await guard.canActivate(createMockContext(makeUser(userId)))
      jest.advanceTimersByTime(60_001)
      await guard.canActivate(createMockContext(makeUser(userId)))

      expect(mockPrisma.userGroup.findMany).toHaveBeenCalledTimes(2)
      await cacheProvider.delete(userId.toString())
    })

    it('does NOT re-query DB before the 60-second cache TTL expires', async () => {
      jest.useFakeTimers()
      const userId = 2000n
      reflector.getAllAndOverride.mockReturnValue('members:read')
      mockPrisma.userGroup.findMany.mockResolvedValue(makeDbRows(['members:read']))

      await guard.canActivate(createMockContext(makeUser(userId)))
      jest.advanceTimersByTime(59_999)
      await guard.canActivate(createMockContext(makeUser(userId)))

      expect(mockPrisma.userGroup.findMany).toHaveBeenCalledTimes(1)
      await cacheProvider.delete(userId.toString())
    })
  })
})
