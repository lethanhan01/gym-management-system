import bcrypt from 'bcryptjs'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}))

const mockPrisma = {
  user: { update: jest.fn(), findUnique: jest.fn() },
  staff: { findFirst: jest.fn() },
  member: { findFirst: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
}

const mockUsersService = {
  findByEmailWithRoles: jest.fn(),
  findByLineIdWithRoles: jest.fn(),
}

const mockJwtService = {
  signAsync: jest.fn(),
}

const mockAuditService = {
  log: jest.fn(),
}

const mockPasswordResetService = {
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}

const mockEmailVerificationService = {
  verifyEmail: jest.fn(),
  resendVerify: jest.fn(),
}

const mockLineOAuthService = {
  lineLogin: jest.fn(),
}

const baseUser = {
  userId: 1n,
  email: 'user@gym.local',
  fullName: 'Test User',
  passwordHash: '$2b$12$currenthash',
  status: 'active',
  emailVerifiedAt: new Date(),
  lineId: null,
  roles: ['member' as const],
  deletedAt: null,
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    service = new AuthService(
      mockPrisma as any,
      mockUsersService as any,
      mockJwtService as any,
      mockAuditService as any,
      mockPasswordResetService as any,
      mockEmailVerificationService as any,
      mockLineOAuthService as any
    )
    jest.clearAllMocks()
    mockJwtService.signAsync.mockResolvedValue('mock.jwt.token')
    mockAuditService.log.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  describe('login', () => {
    it('returns accessToken and user data on valid credentials', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })

      const result = await service.login('user@gym.local', 'Password123!')

      expect(result.accessToken).toBe('mock.jwt.token')
      expect(result.user.userId).toBe('1')
      expect(result.user.email).toBe('user@gym.local')
      expect(result.user.roles).toEqual(['member'])
    })

    it('JWT payload sub is userId as string (BigInt serialization)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '1', email: 'user@gym.local', roles: ['member'] })
      )
    })

    it('JWT payload includes staffId as string when staff record exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, roles: ['staff'] })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: '5' })
      )
    })

    it('JWT payload includes memberId as string when member record exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 42n })

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: '42' })
      )
    })

    it('throws UnauthorizedException when email is not found (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      await expect(service.login('nobody@gym.local', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when passwordHash is null (LINE-only account)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, passwordHash: null })

      await expect(service.login('user@gym.local', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.login('user@gym.local', 'wrongpass')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('email-not-found and wrong-password produce the same error message (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)
      const emailErr = await service
        .login('x@gym.local', 'p')
        .catch((e) => e as UnauthorizedException)

      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      const passErr = await service
        .login('user@gym.local', 'wrong')
        .catch((e) => e as UnauthorizedException)

      expect((emailErr as UnauthorizedException).message).toBe(
        (passErr as UnauthorizedException).message
      )
    })

    it('throws UnauthorizedException with lock message when account is locked', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, status: 'locked' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const err = await service.login('user@gym.local', 'Password123!').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Tài khoản đã bị khoá')
    })

    it('activates account and returns token when status is pending_verification (first login)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({
        ...baseUser,
        status: 'pending_verification',
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await service.login('user@gym.local', 'Password123!')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: baseUser.userId },
          data: expect.objectContaining({ status: 'active' }),
        })
      )
      expect(result).toHaveProperty('accessToken')
    })

    it('validates password BEFORE checking status (locked account with wrong password shows generic error)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, status: 'locked' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const err = await service.login('user@gym.local', 'wrong').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Email hoặc mật khẩu không đúng')
    })
  })

  // ---------------------------------------------------------------------------
  // forgotPassword — delegates to PasswordResetService
  // ---------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('delegates to passwordResetService and returns its result', async () => {
      const expected = { message: 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi' }
      mockPasswordResetService.forgotPassword.mockResolvedValue(expected)

      const result = await service.forgotPassword('user@gym.local')

      expect(mockPasswordResetService.forgotPassword).toHaveBeenCalledWith('user@gym.local', {})
      expect(result).toBe(expected)
    })
  })

  // ---------------------------------------------------------------------------
  // resetPassword — delegates to PasswordResetService
  // ---------------------------------------------------------------------------

  describe('resetPassword', () => {
    it('delegates to passwordResetService and returns its result', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(undefined)

      await service.resetPassword('user@gym.local', '123456', 'NewPass1!')

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith('user@gym.local', '123456', 'NewPass1!', {})
    })
  })

  // ---------------------------------------------------------------------------
  // verifyEmail — delegates to EmailVerificationService
  // ---------------------------------------------------------------------------

  describe('verifyEmail', () => {
    it('delegates to emailVerificationService and returns its result', async () => {
      mockEmailVerificationService.verifyEmail.mockResolvedValue(undefined)

      await service.verifyEmail('user@gym.local', '123456')

      expect(mockEmailVerificationService.verifyEmail).toHaveBeenCalledWith('user@gym.local', '123456', {})
    })
  })

  // ---------------------------------------------------------------------------
  // changePassword
  // ---------------------------------------------------------------------------

  describe('changePassword', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when passwordHash is null (LINE-only account)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: null })

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException with correct message when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: '$2b$12$hash' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const err = await service.changePassword(1n, 'wrong', 'new').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Mật khẩu hiện tại không đúng')
    })

    it('hashes new password with bcrypt salt 12 and updates DB on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: '$2b$12$hash' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash')
      mockPrisma.user.update.mockResolvedValue({})

      await service.changePassword(1n, 'CurrentPass1!', 'NewPass1!')

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1!', 12)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n },
          data: { passwordHash: '$2b$12$newhash' },
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // lineLogin — delegates to LineOAuthService
  // ---------------------------------------------------------------------------

  describe('lineLogin', () => {
    it('delegates to lineOAuthService and returns its result', async () => {
      const expected = { accessToken: 'mock.jwt.token', user: { userId: '1', roles: ['member'] } }
      mockLineOAuthService.lineLogin.mockResolvedValue(expected)

      const result = await service.lineLogin('valid_id_token')

      expect(mockLineOAuthService.lineLogin).toHaveBeenCalledWith('valid_id_token', {})
      expect(result).toBe(expected)
    })
  })

  // ---------------------------------------------------------------------------
  // External dependency failures (Phase 8)
  // ---------------------------------------------------------------------------

  describe('external dependency failures', () => {
    it('propagates error from passwordResetService in resetPassword', async () => {
      mockPasswordResetService.resetPassword.mockRejectedValue(new Error('sub-service error'))

      await expect(service.resetPassword('user@gym.local', '123456', 'NewPass1!')).rejects.toThrow(
        'sub-service error'
      )
    })

    it('propagates error when bcrypt.compare throws in login', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockRejectedValue(new Error('bcrypt.compare failed'))

      await expect(service.login('user@gym.local', 'Password123!')).rejects.toThrow(
        'bcrypt.compare failed'
      )
    })

    it('propagates network error when prisma.user.findUnique throws in changePassword', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection lost'))

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        'DB connection lost'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // resendVerify — delegates to EmailVerificationService
  // ---------------------------------------------------------------------------

  describe('resendVerify', () => {
    it('delegates to emailVerificationService and returns its result', async () => {
      const expected = { message: 'Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi' }
      mockEmailVerificationService.resendVerify.mockResolvedValue(expected)

      const result = await service.resendVerify('user@gym.local')

      expect(mockEmailVerificationService.resendVerify).toHaveBeenCalledWith('user@gym.local', {})
      expect(result).toBe(expected)
    })
  })
})
