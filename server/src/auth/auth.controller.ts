import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Post, Req, BadRequestException, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { UsersService } from './users.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { AuthService, RequestContext } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ResendVerifyDto } from './dto/resend-verify.dto'
import { LineLoginDto } from './dto/line-login.dto'
import { AuthenticatedUser } from './types/jwt-payload.interface'
import { ApiBody, ApiOperation } from '@nestjs/swagger'
import { DatabaseRetryable } from '../common/decorators/database-retryable.decorator'

@Controller('auth')
@DatabaseRetryable()
export class AuthController {
  private static readonly resetGrantCookie = 'password_reset_grant'
  private static readonly resetGrantMaxAge = 10 * 60 * 1000
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /** Trich xuat IP va User-Agent tu request de ghi audit log. */
  private getCtx(req: Request): RequestContext {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'],
    }
  }

  // ---------------------------------------------------------------------------
  // UC00 — Dang nhap
  // ---------------------------------------------------------------------------

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto.email, dto.password, this.getCtx(req))
    return { success: true, data: result }
  }

  // ---------------------------------------------------------------------------
  // UC01 — Dang xuat (JWT stateless — client xoa token, server chi log)
  // ---------------------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: `Đã đăng xuất khỏi tài khoản ${user.email}`,
    }
  }

  // ---------------------------------------------------------------------------
  // UC00 — Lay thong tin user hien tai
  // ---------------------------------------------------------------------------

  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser) {
    const user = await this.usersService.findByIdWithRoles(current.userId)
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại')
    }
    return {
      success: true,
      data: {
        userId: user.userId.toString(),
        email: user.email,
        phone: user.phone ?? null,
        fullName: user.fullName,
        status: user.status,
        roles: user.roles,
        staffId: current.staffId?.toString() ?? null,
        memberId: user.memberId?.toString() ?? null,
        lineLinked: !!user.lineId,
      },
    }
  }

  // ---------------------------------------------------------------------------
  // UC02 — Quen mat khau: yeu cau OTP
  // ---------------------------------------------------------------------------

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.authService.forgotPassword(dto.email, this.getCtx(req))
    return { success: true, ...result }
  }

  // ---------------------------------------------------------------------------
  // UC02 — Dat lai mat khau bang OTP
  // ---------------------------------------------------------------------------

  @Public()
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const grant = await this.authService.verifyResetOtp(dto.email, dto.otp, this.getCtx(req))
    res.cookie(AuthController.resetGrantCookie, grant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AuthController.resetGrantMaxAge,
      path: '/api/v1/auth',
    })
    return { success: true, message: 'OTP hợp lệ' }
  }

  private getCookie(req: Request, name: string): string | undefined {
    const prefix = `${name}=`
    const value = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length)
    return value ? decodeURIComponent(value) : undefined
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      await this.authService.resetPassword(this.getCookie(req, AuthController.resetGrantCookie), dto.newPassword, this.getCtx(req))
    } finally {
      res.clearCookie(AuthController.resetGrantCookie, { path: '/api/v1/auth', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
    }
    return { success: true, message: 'Đặt lại mật khẩu thành công' }
  }

  // ---------------------------------------------------------------------------
  // UC13 — Xac thuc email (NEW)
  // ---------------------------------------------------------------------------

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    await this.authService.verifyEmail(dto.email, dto.otp, this.getCtx(req))
    return { success: true, message: 'Xác thực email thành công' }
  }

  // ---------------------------------------------------------------------------
  // UC13 — Gui lai OTP xac thuc email (NEW)
  // ---------------------------------------------------------------------------

  @Public()
  @Post('resend-verify')
  @HttpCode(HttpStatus.OK)
  async resendVerify(@Body() dto: ResendVerifyDto, @Req() req: Request) {
    const result = await this.authService.resendVerify(dto.email, this.getCtx(req))
    return { success: true, ...result }
  }

  // ---------------------------------------------------------------------------
  // LINE LIFF — Dang nhap bang LINE ID token
  // ---------------------------------------------------------------------------

  @Public()
  @Post('line-login')
  @HttpCode(HttpStatus.OK)
  async lineLogin(@Body() dto: LineLoginDto, @Req() req: Request) {
    const result = await this.authService.lineLogin(dto.idToken, this.getCtx(req))
    return { success: true, data: result }
  }

  // LINE — Lien ket tai khoan LINE voi tai khoan hien tai (JWT required)
  @Post('line-link')
  @HttpCode(HttpStatus.OK)
  async linkLine(@Body() dto: LineLoginDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.linkLine(user.userId, dto.idToken)
    return { success: true, data: result }
  }

  // LINE — Huy lien ket tai khoan LINE (JWT required)
  @Delete('line-link')
  @HttpCode(HttpStatus.OK)
  async unlinkLine(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.unlinkLine(user.userId)
    return { success: true, message: 'Đã hủy liên kết tài khoản LINE' }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu của tài khoản đang đăng nhập' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string', format: 'password', writeOnly: true },
        newPassword: { type: 'string', format: 'password', writeOnly: true, minLength: 8 },
      },
    },
  })
  async changePassword(
    @Body() dto: { currentPassword: string; newPassword: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('currentPassword và newPassword là bắt buộc')
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 8 ký tự')
    }
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword, this.getCtx(req))
    return { success: true, message: 'Đổi mật khẩu thành công' }
  }
}
