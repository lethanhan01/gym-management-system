import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { AuthService } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { AuthenticatedUser } from './types/jwt-payload.interface'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /** UC00 - Dang nhap */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password)
    return { success: true, data: result }
  }

  /** UC01 - Dang xuat (client-side discard token, server log). */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    // Voi JWT stateless, logout chu yeu o client. Backend co the them blacklist neu can.
    return {
      success: true,
      message: `Da dang xuat khoi tai khoan ${user.email}`,
    }
  }

  /** UC02 - Quen mat khau (gui OTP) */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email)
    return { success: true, ...result }
  }

  /** UC02 - Dat lai mat khau bang OTP */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword)
    return { success: true, message: 'Dat lai mat khau thanh cong' }
  }

  /** Tra ve thong tin user hien tai. */
  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser) {
    const user = await this.usersService.findByIdWithRoles(current.userId)
    if (!user) {
      return { success: false, code: 'NOT_FOUND', message: 'Tai khoan khong ton tai' }
    }
    return {
      success: true,
      data: {
        userId: user.userId.toString(),
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
        roles: user.roles,
      },
    }
  }
}
