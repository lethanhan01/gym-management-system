import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Req, BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { UsersService } from './users.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { AuthService, RequestContext } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ResendVerifyDto } from './dto/resend-verify.dto'
import { LineLoginDto } from './dto/line-login.dto'
import { AuthenticatedUser } from './types/jwt-payload.interface'

@Controller('auth')
export class AuthController {
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
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword, this.getCtx(req))
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

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
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
