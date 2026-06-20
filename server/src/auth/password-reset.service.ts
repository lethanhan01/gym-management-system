import { randomInt } from 'crypto'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import type { RequestContext } from './auth.service'
import { OTP_TTL_MS, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS, isDemoOtp } from './auth.constants'

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly rateLimit: RateLimitService,
    private readonly otpStore: OtpStoreService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // UC02 — Quen mat khau: yeu cau OTP
  // ---------------------------------------------------------------------------

  async forgotPassword(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const MSG = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      // Anti-enumeration: khong tiet lo email co ton tai hay khong
      await this.audit.log({
        action: 'auth.password-reset',
        resourceType: 'auth',
        afterData: { step: 'request', email_attempted: email },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG }
    }

    // Rate limit: 3 request/gio/email (in-memory, single-instance)
    if (!this.rateLimit.isAllowed(`forgot-password:${email}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.password-reset',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'request', rate_limited: true },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG } // 200 silently, anti-enumeration
    }

    const otp = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(otp, 10)

    this.otpStore.set(user.userId, 'password_reset', codeHash, OTP_TTL_MS)

    // TODO: gui OTP qua email khi SMTP duoc cau hinh (Architecture §8 R8)
    this.logger.log(`[forgotPassword] OTP cho ${email}: ${otp}`)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.password-reset',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'request' },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined
    return { message: MSG, ...(devOtp && { devOtp }) }
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
    const INVALID_MSG = 'OTP không hợp lệ hoặc đã hết hạn'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new UnauthorizedException(INVALID_MSG)

    // DEMO ONLY: master OTP qua thang, doi mat khau ngay.
    if (isDemoOtp(otp)) {
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await this.prisma.user.update({ where: { userId: user.userId }, data: { passwordHash } })
      this.otpStore.delete(user.userId, 'password_reset')
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.password-reset',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'complete', success: true, demoOtp: true },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return
    }

    const entry = this.otpStore.get(user.userId, 'password_reset')
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.otpStore.delete(user.userId, 'password_reset')
      throw new UnauthorizedException(INVALID_MSG)
    }

    const valid = await bcrypt.compare(otp, entry.codeHash)
    if (!valid) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.password-reset',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'complete', success: false },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException(INVALID_MSG)
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { userId: user.userId }, data: { passwordHash } })
    this.otpStore.delete(user.userId, 'password_reset')

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.password-reset',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'complete', success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }
}
