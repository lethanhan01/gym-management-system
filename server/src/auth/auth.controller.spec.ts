import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthenticatedUser } from './types/jwt-payload.interface'

const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerify: jest.fn(),
  lineLogin: jest.fn(),
  changePassword: jest.fn(),
}

const mockUsersService = {
  findByIdWithRoles: jest.fn(),
}

function makeReq(overrides: object = {}) {
  return {
    headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'Jest/1.0' },
    ip: '127.0.0.1',
    ...overrides,
  } as any
}

function makeCurrentUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 1n,
    email: 'user@gym.local',
    roles: ['member'],
    ...overrides,
  }
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(() => {
    controller = new AuthController(mockAuthService as any, mockUsersService as any)
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  describe('login', () => {
    it('delegates to authService.login and wraps result in { success: true, data }', async () => {
      const serviceResult = { accessToken: 'tok', user: { userId: '1', email: 'user@gym.local' } }
      mockAuthService.login.mockResolvedValue(serviceResult)

      const result = await controller.login(
        { email: 'user@gym.local', password: 'Pass1!' } as any,
        makeReq()
      )

      expect(result).toEqual({ success: true, data: serviceResult })
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'user@gym.local',
        'Pass1!',
        expect.objectContaining({ ip: '10.0.0.1' })
      )
    })

    it('extracts IP from x-forwarded-for header', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'tok', user: {} })

      await controller.login({ email: 'u@e.com', password: 'p' } as any, makeReq())

      const ctx = mockAuthService.login.mock.calls[0][2]
      expect(ctx.ip).toBe('10.0.0.1')
    })

    it('falls back to req.ip when x-forwarded-for header is absent', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'tok', user: {} })

      await controller.login(
        { email: 'u@e.com', password: 'p' } as any,
        {
          headers: { 'user-agent': 'Jest' },
          ip: '192.168.1.1',
        } as any
      )

      const ctx = mockAuthService.login.mock.calls[0][2]
      expect(ctx.ip).toBe('192.168.1.1')
    })
  })

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------

  describe('logout', () => {
    it('returns success message with user email without calling any service', async () => {
      const user = makeCurrentUser({ email: 'owner@gym.local' })

      const result = await controller.logout(user)

      expect(result).toEqual({
        success: true,
        message: 'Đã đăng xuất khỏi tài khoản owner@gym.local',
      })
      expect(mockAuthService.login).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // me
  // ---------------------------------------------------------------------------

  describe('me', () => {
    it('throws NotFoundException when user is not found', async () => {
      mockUsersService.findByIdWithRoles.mockResolvedValue(null)

      await expect(controller.me(makeCurrentUser())).rejects.toThrow(NotFoundException)
    })

    it('calls findByIdWithRoles with current.userId', async () => {
      mockUsersService.findByIdWithRoles.mockResolvedValue({
        userId: 1n,
        email: 'u@e.com',
        phone: null,
        fullName: 'Test',
        status: 'active',
        roles: ['member'],
        memberId: null,
      })

      await controller.me(makeCurrentUser({ userId: 1n }))

      expect(mockUsersService.findByIdWithRoles).toHaveBeenCalledWith(1n)
    })

    it('returns success: true with transformed user fields (userId as string)', async () => {
      mockUsersService.findByIdWithRoles.mockResolvedValue({
        userId: 2n,
        email: 'staff@gym.local',
        phone: '0909123456',
        fullName: 'Staff User',
        status: 'active',
        roles: ['staff'],
        memberId: null,
      })
      const current = makeCurrentUser({ userId: 2n, staffId: 5n, roles: ['staff'] })

      const result = await controller.me(current)

      expect(result.success).toBe(true)
      expect(result.data.userId).toBe('2')
      expect(result.data.email).toBe('staff@gym.local')
      expect(result.data.fullName).toBe('Staff User')
      expect(result.data.staffId).toBe('5')
    })

    it('includes memberId from user record as string when present', async () => {
      mockUsersService.findByIdWithRoles.mockResolvedValue({
        userId: 1n,
        email: 'member@gym.local',
        phone: null,
        fullName: 'Member',
        status: 'active',
        roles: ['member'],
        memberId: 99n,
      })

      const result = await controller.me(makeCurrentUser())

      expect(result.data.memberId).toBe('99')
    })

    it('returns null memberId when user has no member record', async () => {
      mockUsersService.findByIdWithRoles.mockResolvedValue({
        userId: 1n,
        email: 'u@e.com',
        phone: null,
        fullName: 'U',
        status: 'active',
        roles: ['staff'],
        memberId: null,
      })

      const result = await controller.me(makeCurrentUser())

      expect(result.data.memberId).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // forgotPassword
  // ---------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('delegates to authService.forgotPassword and spreads result', async () => {
      const serviceResult = { message: 'OTP sent' }
      mockAuthService.forgotPassword.mockResolvedValue(serviceResult)

      const result = await controller.forgotPassword({ email: 'u@e.com' } as any, makeReq())

      expect(result).toEqual({ success: true, message: 'OTP sent' })
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'u@e.com',
        expect.objectContaining({ ip: '10.0.0.1' })
      )
    })

    it('spreads devOtp from service result when present', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'sent', devOtp: '654321' })

      const result = await controller.forgotPassword({ email: 'u@e.com' } as any, makeReq())

      expect((result as any).devOtp).toBe('654321')
    })
  })

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------

  describe('resetPassword', () => {
    it('delegates to authService.resetPassword and returns success message', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined)

      const result = await controller.resetPassword(
        { email: 'u@e.com', otp: '123456', newPassword: 'NewPass1!' } as any,
        makeReq()
      )

      expect(result).toEqual({ success: true, message: 'Đặt lại mật khẩu thành công' })
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'u@e.com',
        '123456',
        'NewPass1!',
        expect.any(Object)
      )
    })
  })

  // ---------------------------------------------------------------------------
  // verifyEmail
  // ---------------------------------------------------------------------------

  describe('verifyEmail', () => {
    it('delegates to authService.verifyEmail and returns success message', async () => {
      mockAuthService.verifyEmail.mockResolvedValue(undefined)

      const result = await controller.verifyEmail(
        { email: 'u@e.com', otp: '654321' } as any,
        makeReq()
      )

      expect(result).toEqual({ success: true, message: 'Xác thực email thành công' })
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(
        'u@e.com',
        '654321',
        expect.any(Object)
      )
    })
  })

  // ---------------------------------------------------------------------------
  // resendVerify
  // ---------------------------------------------------------------------------

  describe('resendVerify', () => {
    it('delegates to authService.resendVerify and spreads result', async () => {
      mockAuthService.resendVerify.mockResolvedValue({ message: 'OTP resent' })

      const result = await controller.resendVerify({ email: 'u@e.com' } as any, makeReq())

      expect(result.success).toBe(true)
      expect((result as any).message).toBe('OTP resent')
    })
  })

  // ---------------------------------------------------------------------------
  // lineLogin
  // ---------------------------------------------------------------------------

  describe('lineLogin', () => {
    it('delegates to authService.lineLogin and wraps result in { success, data }', async () => {
      const serviceResult = { accessToken: 'line.jwt', user: { userId: '3', roles: ['member'] } }
      mockAuthService.lineLogin.mockResolvedValue(serviceResult)

      const result = await controller.lineLogin({ idToken: 'id_tok' } as any, makeReq())

      expect(result).toEqual({ success: true, data: serviceResult })
      expect(mockAuthService.lineLogin).toHaveBeenCalledWith('id_tok', expect.any(Object))
    })
  })

  // ---------------------------------------------------------------------------
  // changePassword
  // ---------------------------------------------------------------------------

  describe('changePassword', () => {
    it('throws BadRequestException when currentPassword is missing', async () => {
      await expect(
        controller.changePassword(
          { currentPassword: '', newPassword: 'NewPass1!' },
          makeCurrentUser(),
          makeReq()
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when newPassword is missing', async () => {
      await expect(
        controller.changePassword(
          { currentPassword: 'Current1!', newPassword: '' },
          makeCurrentUser(),
          makeReq()
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when newPassword is shorter than 8 characters', async () => {
      await expect(
        controller.changePassword(
          { currentPassword: 'Current1!', newPassword: 'short' },
          makeCurrentUser(),
          makeReq()
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('delegates to authService.changePassword with userId from JWT', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined)
      const user = makeCurrentUser({ userId: 5n })

      await controller.changePassword(
        { currentPassword: 'Current1!', newPassword: 'NewPass1!' },
        user,
        makeReq()
      )

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        5n,
        'Current1!',
        'NewPass1!',
        expect.any(Object)
      )
    })

    it('returns success message on successful change', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined)

      const result = await controller.changePassword(
        { currentPassword: 'Current1!', newPassword: 'NewPass1!' },
        makeCurrentUser(),
        makeReq()
      )

      expect(result).toEqual({ success: true, message: 'Đổi mật khẩu thành công' })
    })

    it('accepts newPassword of exactly 8 characters (boundary)', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined)

      await expect(
        controller.changePassword(
          { currentPassword: 'Current1!', newPassword: '12345678' },
          makeCurrentUser(),
          makeReq()
        )
      ).resolves.not.toThrow()
    })
  })
})
