import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserStatus } from '@prisma/client'
import { LineOAuthService } from './line-oauth.service'
import { LINE_MOCK_ID_TOKEN, LINE_MOCK_USER_EMAIL, LINE_MOCK_USER_ID } from '../line-mock/constants'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { UsersService } from './users.service'

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

describe('LineOAuthService LIFF Mock', () => {
  let service: LineOAuthService

  beforeEach(() => {
    env.LINE_MOCK_ENABLED = 'true'
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

  it('does not accept the opaque mock token when mock mode is disabled', async () => {
    env.LINE_MOCK_ENABLED = 'false'
    env.LINE_CHANNEL_ID = 'real-channel-id'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('{}'),
    }) as unknown as typeof fetch

    await expect(service.lineLogin(LINE_MOCK_ID_TOKEN)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.line.me/oauth2/v2.1/verify',
      expect.objectContaining({ method: 'POST' })
    )
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
      data: { lineId: LINE_MOCK_USER_ID },
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
})
