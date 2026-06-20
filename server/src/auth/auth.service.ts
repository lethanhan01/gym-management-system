import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { JwtPayload } from './types/jwt-payload.interface'
import { PasswordResetService } from './password-reset.service'
import { EmailVerificationService } from './email-verification.service'
import { LineOAuthService } from './line-oauth.service'

export interface LoginResult {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
    staffId?: string   // ◄── Thêm trường này vào interface kết quả trả về
    memberId?: string  // ◄── Thêm trường này vào interface kết quả trả về
  }
}

/** Context HTTP de ghi audit (IP, User-Agent). */
export interface RequestContext {
  ip?: string
  userAgent?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly passwordReset: PasswordResetService,
    private readonly emailVerification: EmailVerificationService,
    private readonly lineOAuth: LineOAuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // UC00 — Dang nhap
  // ---------------------------------------------------------------------------

  async login(email: string, password: string, ctx: RequestContext = {}): Promise<LoginResult> {
    const user = await this.users.findByEmailWithRoles(email)

    // Email khong ton tai — anti-enumeration: cung message voi sai password
    if (!user) {
      await this.audit.log({
        action: 'auth.login',
        resourceType: 'auth',
        afterData: { success: false, reason: 'invalid_credentials', email_attempted: email },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    // Kiem tra password TRUOC khi check status (spec §3.1 thu tu WHEN-THEN)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash)
    if (!passwordOk) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'invalid_credentials' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    if (user.status === UserStatus.locked) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'user_disabled' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Tài khoản đã bị khoá')
    }

    // Tài khoản nhân sự được tạo bởi owner có mật khẩu mặc định, status pending_verification.
    // Lần đăng nhập đầu tiên thành công → kích hoạt tài khoản thay vì block.
    if (user.status === UserStatus.pending_verification) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { status: UserStatus.active, emailVerifiedAt: new Date() },
      })
      user.status = UserStatus.active
    }

    // 1. TỰ ĐỘNG TRA CỨU: Tìm kiếm song song dữ liệu liên quan dưới DB từ userId
    const [staff, memberRecord] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.member.findFirst({ where: { userId: user.userId, deletedAt: null } })
    ])

    // 2. NẠP DỮ LIỆU VÀO PAYLOAD: Đóng gói thêm staffId và memberId (đổi sang string để JWT hiểu)
    const payload: JwtPayload = {
      sub: user.userId.toString(),
      email: user.email,
      roles: user.roles,
      staffId: staff?.staffId ? staff.staffId.toString() : undefined,
      memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
    }
    const accessToken = await this.jwt.signAsync(payload)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    // 3. TRẢ VỀ RESPONSE: Trả thêm dữ liệu phẳng ra ngoài object user nếu client muốn dùng trực tiếp
    return {
      accessToken,
      user: {
        userId: user.userId.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        staffId: staff?.staffId ? staff.staffId.toString() : undefined,
        memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
      },
    }
  }

  // ---------------------------------------------------------------------------
  // UC02 — Quen mat khau: yeu cau OTP
  // ---------------------------------------------------------------------------

  async forgotPassword(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    return this.passwordReset.forgotPassword(email, ctx)
  }

  // ---------------------------------------------------------------------------
  // UC02 — Dat lai mat khau bang OTP
  // ---------------------------------------------------------------------------

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    ctx: RequestContext = {},
  ): Promise<void> {
    return this.passwordReset.resetPassword(email, otp, newPassword, ctx)
  }

  // ---------------------------------------------------------------------------
  // UC13 — Xac thuc email lan dau (verify-email)
  // ---------------------------------------------------------------------------

  async verifyEmail(email: string, otp: string, ctx: RequestContext = {}): Promise<void> {
    return this.emailVerification.verifyEmail(email, otp, ctx)
  }

  async resendVerify(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    return this.emailVerification.resendVerify(email, ctx)
  }

  // ---------------------------------------------------------------------------
  // LINE LIFF Login — delegated to LineOAuthService
  // ---------------------------------------------------------------------------

  async lineLogin(idToken: string, ctx: RequestContext = {}): Promise<LoginResult> {
    return this.lineOAuth.lineLogin(idToken, ctx)
  }

  // ---------------------------------------------------------------------------
  // Change password (authenticated user đổi mật khẩu của chính mình)
  // ---------------------------------------------------------------------------

  async changePassword(userId: bigint, currentPassword: string, newPassword: string, ctx: RequestContext = {}): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { userId } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Không tìm thấy tài khoản')

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new UnauthorizedException('Mật khẩu hiện tại không đúng')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { userId }, data: { passwordHash } })

    await this.audit.log({
      actorUserId: userId,
      action: 'auth.change-password',
      resourceType: 'auth',
      resourceId: userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }
}
