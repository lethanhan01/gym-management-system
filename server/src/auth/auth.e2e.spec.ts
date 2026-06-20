/**
 * Auth E2E Integration Tests
 * Mock PrismaService ở module level — không kết nối DB thực.
 * Tests chạy qua HTTP thực (supertest) để verify controller → service → guard pipeline.
 */
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { JwtStrategy } from './strategies/jwt.strategy'
import { AuditService } from '../common/audit/audit.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { PasswordResetService } from './password-reset.service'
import { EmailVerificationService } from './email-verification.service'
import { LineOAuthService } from './line-oauth.service'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

const TEST_SECRET = 'e2e-test-secret-32-chars-minimum!'

const mockPrisma = {
  user: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
  staff: { findFirst: jest.fn() },
  member: { findFirst: jest.fn(), count: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(),
  $queryRawUnsafe: jest.fn(),
}

const mockUsersService = {
  findByEmailWithRoles: jest.fn(),
  findByLineIdWithRoles: jest.fn(),
  findByIdWithRoles: jest.fn(),
}

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'JWT_SECRET') return TEST_SECRET
    if (key === 'JWT_EXPIRES_IN') return '7d'
    if (key === 'LINE_CHANNEL_ID') return undefined
    return undefined
  }),
  getOrThrow: jest.fn().mockImplementation((key: string) => {
    if (key === 'JWT_SECRET') return TEST_SECRET
    throw new Error(`Config key not found: ${key}`)
  }),
}

const baseUser = {
  userId: 1n,
  email: 'member@gym.local',
  fullName: 'Test Member',
  passwordHash: '$2b$12$hashedpassword',
  status: 'active',
  emailVerifiedAt: new Date(),
  lineId: null,
  roles: ['member' as const],
  deletedAt: null,
}

describe('Auth E2E', () => {
  let app: INestApplication
  let jwtService: JwtService

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuditService,
        RateLimitService,
        OtpStoreService,
        PasswordResetService,
        EmailVerificationService,
        LineOAuthService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    jwtService = module.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.auditLog.create.mockResolvedValue({})
    mockPrisma.staff.findFirst.mockResolvedValue(null)
    mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
  })

  // ---------------------------------------------------------------------------
  // POST /api/v1/auth/login
  // ---------------------------------------------------------------------------

  describe('POST /api/v1/auth/login', () => {
    it('200 — returns accessToken on valid credentials', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'member@gym.local', password: 'Password123!' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.data.accessToken).toBe('string')
      expect(res.body.data.user.email).toBe('member@gym.local')
    })

    it('401 — wrong password returns Unauthorized', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'member@gym.local', password: 'WrongPass!' })

      expect(res.status).toBe(401)
    })

    it('401 — email not found returns Unauthorized (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@gym.local', password: 'Password123!' })

      expect(res.status).toBe(401)
    })

    it('400 — missing email returns ValidationPipe error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'Password123!' })

      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // GET /api/v1/auth/me
  // ---------------------------------------------------------------------------

  describe('GET /api/v1/auth/me', () => {
    it('401 — no Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me')

      expect(res.status).toBe(401)
    })

    it('401 — fake/malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer this.is.not.a.valid.jwt')

      expect(res.status).toBe(401)
    })

    it('200 — valid token returns user data', async () => {
      const token = await jwtService.signAsync({
        sub: '1',
        email: 'member@gym.local',
        roles: ['member'],
        memberId: '10',
      })
      mockUsersService.findByIdWithRoles.mockResolvedValue({
        ...baseUser,
        memberId: 10n,
        phone: null,
      })

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe('member@gym.local')
      expect(res.body.data.roles).toContain('member')
    })

    it('401 — expired token', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: '1', email: 'member@gym.local', roles: ['member'] },
        { expiresIn: '-1s' }
      )

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(res.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/v1/auth/forgot-password
  // ---------------------------------------------------------------------------

  describe('POST /api/v1/auth/forgot-password', () => {
    it('200 — always returns success (even for unknown email, anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@gym.local' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('200 — valid email also returns same success response', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedotp')

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'member@gym.local' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('400 — missing email returns ValidationPipe error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // JWT expiry guard
  // ---------------------------------------------------------------------------

  describe('protected endpoints — JWT guard behavior', () => {
    it('401 — POST /logout without token is rejected', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/logout')

      expect(res.status).toBe(401)
    })

    it('200 — POST /logout with valid token succeeds', async () => {
      const token = await jwtService.signAsync({
        sub: '1',
        email: 'member@gym.local',
        roles: ['member'],
      })

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
