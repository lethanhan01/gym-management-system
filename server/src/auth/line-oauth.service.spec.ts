import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserStatus } from '@prisma/client'
import { LineOAuthService } from './line-oauth.service'
import {
  LINE_MOCK_ID_TOKEN,
  LINE_MOCK_USER_EMAIL,
  LINE_MOCK_USER_ID,
  LINE_MOCK_USER_PICTURE,
} from '../line-mock/constants'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { UsersService } from './users.service'
import { jwtVerify } from 'jose'

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
}))

const env: Record<string, string | undefined> = {
  LINE_MOCK_ENABLED: 'true',
}

const config = {
  get: jest.fn((key: string) => env[key]),
}

const user = {
  userId: 1n,
  email: 'liff.mock.member@gym.local',
  fullName: 'LIFF Mock Member',
  roles: ['member'],
  status: UserStatus.active,
  lineId: LINE_MOCK_USER_ID,
  avatarUrl: LINE_MOCK_USER_PICTURE,
  avatarFileId: null,
}

const prisma = {
  staff: { findFirst: jest.fn().mockResolvedValue(null) },
  member: {
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn().mockResolvedValue({ memberId: 10n }),
  },
  group: { findUnique: jest.fn() },
  userGroup: { create: jest.fn() },
  user: { create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
}

const users = {
  findByLineIdWithRoles: jest.fn().mockResolvedValue(user),
  findByEmailWithRoles: jest.fn(),
  findByLineIdIncludingDeleted: jest.fn(),
  findByEmailIncludingDeleted: jest.fn(),
}

const jwt = { signAsync: jest.fn().mockResolvedValue('app-jwt') }
const audit = { log: jest.fn().mockResolvedValue(undefined) }

describe('LineOAuthService LIFF Mock & JWKS Verification', () => {
  let service: LineOAuthService

  beforeEach(() => {
    env.LINE_MOCK_ENABLED = 'true'
    env.LINE_CHANNEL_ID = 'test-channel-id'
    jest.clearAllMocks()
    config.get.mockImplementation((key: string) => env[key])
    users.findByLineIdWithRoles.mockResolvedValue(user)
    users.findByEmailWithRoles.mockResolvedValue(null)
    users.findByLineIdIncludingDeleted.mockResolvedValue(null)
    users.findByEmailIncludingDeleted.mockResolvedValue(null)
    prisma.staff.findFirst.mockResolvedValue(null)
    prisma.member.findFirst.mockResolvedValue({ memberId: 10n })
    prisma.member.count.mockResolvedValue(0)
    prisma.user.update.mockResolvedValue(undefined)
    jwt.signAsync.mockResolvedValue('app-jwt')
    service = new LineOAuthService(
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      audit as unknown as AuditService
    )
  })

  it('accepts only the fixed mock token and signs in the mock member', async () => {
    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).resolves.toMatchObject({
      accessToken: 'app-jwt',
      user: { userId: '1', roles: ['member'], memberId: '10' },
    })
    expect(users.findByLineIdWithRoles).toHaveBeenCalledWith(LINE_MOCK_USER_ID)

    await expect(service.lineLogin('another-token')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('verifies token via JWKS when mock mode is disabled', async () => {
    env.LINE_MOCK_ENABLED = 'false'
    ;(jwtVerify as jest.Mock).mockResolvedValueOnce({
      payload: {
        sub: LINE_MOCK_USER_ID,
        name: 'Real LINE Member',
        email: 'real@line.me',
      },
    })

    await expect(service.lineLogin('valid-real-id-token')).resolves.toMatchObject({
      accessToken: 'app-jwt',
      user: { userId: '1', roles: ['member'] },
    })
    expect(jwtVerify).toHaveBeenCalledWith(
      'valid-real-id-token',
      expect.anything(),
      expect.objectContaining({
        issuer: 'https://access.line.me',
        audience: 'test-channel-id',
      })
    )
  })

  it('falls back to HTTP verify when JWKS verification fails', async () => {
    env.LINE_MOCK_ENABLED = 'false'
    ;(jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('JWKS verification error'))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: LINE_MOCK_USER_ID,
        name: 'Fallback Member',
        email: 'fallback@line.me',
      }),
    }) as unknown as typeof fetch

    await expect(service.lineLogin('fallback-token')).resolves.toMatchObject({
      accessToken: 'app-jwt',
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.line.me/oauth2/v2.1/verify',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not accept the token when both JWKS and HTTP verify fail', async () => {
    env.LINE_MOCK_ENABLED = 'false'
    ;(jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('JWKS signature invalid'))
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('{}'),
    }) as unknown as typeof fetch

    await expect(service.lineLogin('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('links an active account with the same email without creating a member', async () => {
    const unlinkedUser = { ...user, lineId: null }
    users.findByLineIdWithRoles.mockResolvedValue(null)
    users.findByEmailWithRoles.mockResolvedValue(unlinkedUser)

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).resolves.toMatchObject({
      user: { userId: '1', roles: ['member'] },
    })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 1n },
      data: { lineId: LINE_MOCK_USER_ID, avatarUrl: LINE_MOCK_USER_PICTURE },
    })
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ afterData: { linked_existing_account: true } })
    )
  })

  it.each([
    ['email', 'findByEmailIncludingDeleted'],
    ['line ID', 'findByLineIdIncludingDeleted'],
  ])('rejects a soft-deleted account matched by %s', async (_label, lookup) => {
    const deletedUser = { userId: 99n, deletedAt: new Date(), email: LINE_MOCK_USER_EMAIL }
    users.findByLineIdWithRoles.mockResolvedValue(null)
    if (lookup === 'findByEmailIncludingDeleted') {
      users.findByEmailWithRoles.mockResolvedValue(null)
      users.findByEmailIncludingDeleted.mockResolvedValue(deletedUser)
    } else {
      users.findByLineIdIncludingDeleted.mockResolvedValue(deletedUser)
    }

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_DELETED' }),
    })

    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        afterData: expect.objectContaining({ reason: 'soft_deleted_account_conflict' }),
      })
    )
  })

  it('rejects a soft-deleted email even when the LINE ID has an active match', async () => {
    users.findByEmailIncludingDeleted.mockResolvedValue({
      userId: 99n,
      deletedAt: new Date(),
      email: LINE_MOCK_USER_EMAIL,
    })

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_DELETED' }),
    })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('reuses the active account when a concurrent create conflicts on email', async () => {
    const p2002 = { code: 'P2002', meta: { target: ['email'] } }
    users.findByLineIdWithRoles.mockResolvedValue(null)
    users.findByEmailWithRoles.mockResolvedValueOnce(null).mockResolvedValueOnce(user)
    prisma.member.findFirst.mockResolvedValue(null)
    prisma.$transaction.mockRejectedValue(p2002)

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).resolves.toMatchObject({
      user: { userId: '1', roles: ['member'] },
    })
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ afterData: { unique_conflict_retry: 'email' } })
    )
  })

  it('returns LINE_ALREADY_LINKED when linking races with another account', async () => {
    const otherUser = { ...user, userId: 2n, email: 'other@gym.local' }
    users.findByLineIdWithRoles.mockResolvedValue(null)
    users.findByEmailWithRoles.mockResolvedValue({ ...user, lineId: null })
    users.findByLineIdIncludingDeleted.mockResolvedValueOnce(null).mockResolvedValueOnce(otherUser)
    prisma.user.update.mockRejectedValue({ code: 'P2002', meta: { target: ['line_id'] } })

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'LINE_ALREADY_LINKED' }),
    })
  })

  it('does not swallow a P2002 unrelated to email or LINE ID', async () => {
    const p2002 = { code: 'P2002', meta: { target: ['member_code'] } }
    users.findByLineIdWithRoles.mockResolvedValue(null)
    prisma.member.findFirst.mockResolvedValue(null)
    prisma.$transaction.mockRejectedValue(p2002)

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toBe(p2002)
  })

  it('rejects linking a LINE account held by a soft-deleted user', async () => {
    users.findByLineIdWithRoles.mockResolvedValue(null)
    users.findByLineIdIncludingDeleted.mockResolvedValue({ userId: 99n, deletedAt: new Date() })

    await expect(service.linkLine(1n, LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_DELETED' }),
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('links LINE and saves avatarUrl to the user record', async () => {
    users.findByLineIdWithRoles.mockResolvedValue(null)
    users.findByLineIdIncludingDeleted.mockResolvedValue(null)

    const res = await service.linkLine(1n, LINE_MOCK_ID_TOKEN)
    expect(res).toEqual({
      lineName: 'LIFF Mock Member',
      avatarUrl: LINE_MOCK_USER_PICTURE,
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 1n },
      data: { lineId: LINE_MOCK_USER_ID, avatarUrl: LINE_MOCK_USER_PICTURE },
    })
  })

  it('unlinks LINE and resets lineId and avatarUrl to null', async () => {
    await service.unlinkLine(1n)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 1n },
      data: { lineId: null, avatarUrl: null },
    })
  })

  it('auto-syncs avatarUrl when user logs in and profile picture has changed', async () => {
    const userWithOldAvatar = { ...user, avatarUrl: 'https://old.url/avatar.jpg' }
    users.findByLineIdWithRoles.mockResolvedValue(userWithOldAvatar)

    const res = await service.lineLogin(LINE_MOCK_ID_TOKEN)
    expect(res.user.avatarUrl).toBe(LINE_MOCK_USER_PICTURE)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 1n },
      data: { avatarUrl: LINE_MOCK_USER_PICTURE },
    })
  })

  it('lineLogin succeeds even if prisma.user.update for avatar fails (error isolation)', async () => {
    const userWithOldAvatar = { ...user, avatarUrl: 'https://old.url/avatar.jpg' }
    users.findByLineIdWithRoles.mockResolvedValue(userWithOldAvatar)
    prisma.user.update.mockRejectedValueOnce(new Error('DB connection dropped'))

    const res = await service.lineLogin(LINE_MOCK_ID_TOKEN)
    expect(res.accessToken).toBe('app-jwt')
    expect(res.user.userId).toBe('1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 1n },
      data: { avatarUrl: LINE_MOCK_USER_PICTURE },
    })
  })

  it('lineLogin skips avatar sync when picture URL exceeds 1000 characters', async () => {
    const longUrl = 'https://profile.line-scdn.net/' + 'a'.repeat(1001)
    const userWithOldAvatar = { ...user, avatarUrl: 'https://old.url/avatar.jpg' }
    users.findByLineIdWithRoles.mockResolvedValue(userWithOldAvatar)

    // Bypass mock verification and return payload with long picture
    env.LINE_MOCK_ENABLED = 'false'
    ;(jwtVerify as jest.Mock).mockResolvedValueOnce({
      payload: {
        sub: LINE_MOCK_USER_ID,
        name: 'Mock Member',
        email: 'member@gym.local',
        picture: longUrl,
      },
    })

    const res = await service.lineLogin('long-url-token')
    expect(res.accessToken).toBe('app-jwt')
    // Avatar sync should have been skipped to avoid Postgres VarChar(1000) overflow
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('lineLogin does not attempt avatar sync if user is locked', async () => {
    const lockedUser = { ...user, status: UserStatus.locked }
    users.findByLineIdWithRoles.mockResolvedValue(lockedUser)

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_LOCKED' }),
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('lineLogin does not attempt avatar sync if user role is not member', async () => {
    const trainerUser = { ...user, roles: ['trainer' as const] }
    users.findByLineIdWithRoles.mockResolvedValue(trainerUser)

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'LINE_LOGIN_MEMBER_ONLY' }),
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
