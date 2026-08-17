import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserStatus } from '@prisma/client'
import { LineOAuthService } from './line-oauth.service'
import { LINE_MOCK_ID_TOKEN, LINE_MOCK_USER_ID } from '../line-mock/constants'
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
  member: { findFirst: jest.fn().mockResolvedValue({ memberId: 10n }) },
  user: { update: jest.fn() },
}

const users = {
  findByLineIdWithRoles: jest.fn().mockResolvedValue(user),
  findByEmailWithRoles: jest.fn(),
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
    prisma.staff.findFirst.mockResolvedValue(null)
    prisma.member.findFirst.mockResolvedValue({ memberId: 10n })
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
})
