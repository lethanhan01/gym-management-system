import { UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'

const mockConfig = {
  get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-jwt-secret' : undefined)),
}

const mockUsers = {
  findByIdWithRoles: jest.fn(),
}

const activeUser = {
  userId: 1n,
  email: 'current@gym.local',
  status: 'active',
  roles: ['owner' as const],
  staffId: 12n,
  memberId: null,
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy

  beforeEach(() => {
    jest.clearAllMocks()
    strategy = new JwtStrategy(mockConfig as any, mockUsers as any)
  })

  it('hydrates the authenticated user from current database data, not JWT claims', async () => {
    mockUsers.findByIdWithRoles.mockResolvedValue(activeUser)

    await expect(
      strategy.validate({
        sub: '1',
        email: 'stale@gym.local',
        roles: ['member'],
        memberId: '99',
      }),
    ).resolves.toEqual({
      userId: 1n,
      email: 'current@gym.local',
      roles: ['owner'],
      staffId: 12n,
      memberId: undefined,
    })
    expect(mockUsers.findByIdWithRoles).toHaveBeenCalledWith(1n)
  })

  it.each([
    ['does not exist', null],
    ['is locked', { ...activeUser, status: 'locked' }],
    ['is pending verification', { ...activeUser, status: 'pending_verification' }],
    ['has been soft-deleted', { ...activeUser, deletedAt: new Date() }],
  ])('rejects a token when its user %s', async (_description, user) => {
    mockUsers.findByIdWithRoles.mockResolvedValue(user)

    await expect(strategy.validate({ sub: '1', email: 'user@gym.local', roles: ['member'] })).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rejects a token with an invalid subject before querying the database', async () => {
    await expect(strategy.validate({ sub: 'not-a-bigint', email: 'user@gym.local', roles: ['member'] })).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(mockUsers.findByIdWithRoles).not.toHaveBeenCalled()
  })
})
