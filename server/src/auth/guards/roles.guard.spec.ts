import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { AuthenticatedUser } from '../types/jwt-payload.interface'
import { Role } from '../users.service'

function createMockContext(request: object, handler = () => {}, cls = class {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => request }),
  } as any
}

function makeUser(roles: Role[]): AuthenticatedUser {
  return { userId: 1n, email: 'test@example.com', roles }
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: { getAllAndOverride: jest.Mock }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    guard = new RolesGuard(reflector as any)
  })

  describe('no @Roles() decorator', () => {
    it('returns true when no roles metadata is set (open endpoint)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined)

      expect(guard.canActivate(createMockContext({ user: makeUser(['member']) }))).toBe(true)
    })

    it('returns true when roles metadata is an empty array', () => {
      reflector.getAllAndOverride.mockReturnValue([])

      expect(guard.canActivate(createMockContext({ user: makeUser(['member']) }))).toBe(true)
    })
  })

  describe('user has a matching role', () => {
    it('returns true when user role matches exactly one of the required roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner', 'staff'] as Role[])

      expect(guard.canActivate(createMockContext({ user: makeUser(['staff']) }))).toBe(true)
    })

    it('returns true when user has multiple roles and one matches', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner'] as Role[])

      expect(guard.canActivate(createMockContext({ user: makeUser(['member', 'owner']) }))).toBe(
        true
      )
    })

    it('returns true when user role is the only required role', () => {
      reflector.getAllAndOverride.mockReturnValue(['trainer'] as Role[])

      expect(guard.canActivate(createMockContext({ user: makeUser(['trainer']) }))).toBe(true)
    })
  })

  describe('user does not have a matching role', () => {
    it('throws ForbiddenException when user role is not in required list', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner', 'staff'] as Role[])

      expect(() => guard.canActivate(createMockContext({ user: makeUser(['member']) }))).toThrow(
        ForbiddenException
      )
    })

    it('throws ForbiddenException when user has no roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner'] as Role[])

      expect(() => guard.canActivate(createMockContext({ user: makeUser([]) }))).toThrow(
        ForbiddenException
      )
    })
  })

  describe('missing user in request', () => {
    it('throws ForbiddenException when request.user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner'] as Role[])

      expect(() => guard.canActivate(createMockContext({}))).toThrow(ForbiddenException)
    })
  })

  describe('reflector usage', () => {
    it('reads ROLES_KEY using both handler and class from the context', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined)
      const handler = () => {}
      const cls = class {}

      guard.canActivate(createMockContext({ user: makeUser(['owner']) }, handler, cls))

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, cls])
    })
  })
})
