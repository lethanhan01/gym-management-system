import { randomInt } from 'crypto'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { OtpInvalidException } from './exceptions/otp-invalid.exception'
import { OtpExpiredException } from './exceptions/otp-expired.exception'
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception'
import type { RequestContext } from './auth.service'
import {
  OTP_TTL_MS,
  OTP_RATE_LIMIT,
  OTP_RATE_WINDOW_MS,
  OTP_MAX_ATTEMPTS,
  isDemoOtp,
} from './auth.constants'

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly otpStore: OtpStoreService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // ---------------------------------------------------------------------------
  // UC12 — Xac thuc email bang OTP
  // ---------------------------------------------------------------------------

  async verifyEmail(email: string, otp: string, ctx: RequestContext = {}): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản hoặc mã OTP không hợp lệ')
    }

    // Da xac thuc roi
    if (user.emailVerifiedAt !== null) {
      throw new EmailAlreadyVerifiedException()
    }

    // DEMO ONLY: master OTP qua thang, bo qua het han/so lan thu.
    if (isDemoOtp(otp)) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { status: UserStatus.active, emailVerifiedAt: new Date() },
      })
      this.otpStore.delete(user.userId, 'email_verify')
      return
    }

    const entry = this.otpStore.get(user.userId, 'email_verify')
    if (!entry) {
      throw new NotFoundException('Không tìm thấy mã OTP, vui lòng yêu cầu gửi lại')
    }

    // OTP het han
    if (entry.expiresAt <= Date.now()) {
      this.otpStore.delete(user.userId, 'email_verify')
      throw new OtpExpiredException()
    }

    // Vuot qua so lan thu toi da — force resend
    if (entry.attemptCount >= OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(user.userId, 'email_verify')
      throw new OtpExpiredException()
    }

    // Sai OTP — tang attempt count
    const valid = await bcrypt.compare(otp, entry.codeHash)
    if (!valid) {
      this.otpStore.incrementAttempts(user.userId, 'email_verify')
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.email-verify',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, attempt_count: entry.attemptCount + 1 },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new OtpInvalidException()
    }

    // Thanh cong: active user + xoa OTP
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { status: UserStatus.active, emailVerifiedAt: new Date() },
    })
    this.otpStore.delete(user.userId, 'email_verify')

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.email-verify',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }

  // ---------------------------------------------------------------------------
  // UC13 — Gui lai OTP xac thuc email
  // ---------------------------------------------------------------------------

  async resendVerify(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const MSG = 'Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) return { message: MSG }

    // Da xac thuc roi — tra ve binh thuong, khong tiet lo thong tin
    if (user.emailVerifiedAt !== null) return { message: MSG }

    // Rate limit: 3 request/gio/email
    if (!this.rateLimit.isAllowed(`resend-verify:${email}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.email-verify',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'resend', rate_limited: true },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG }
    }

    const otp = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(otp, 10)

    this.otpStore.set(user.userId, 'email_verify', codeHash, OTP_TTL_MS)

    // TODO: gui OTP qua email khi SMTP duoc cau hinh (Architecture §8 R8)
    this.logger.log(`[resendVerify] OTP cho ${email}: ${otp}`)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.email-verify',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'resend', email_attempted: email },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined
    return { message: MSG, ...(devOtp && { devOtp }) }
  }
}
