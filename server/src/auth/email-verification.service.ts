import { Injectable, NotFoundException } from '@nestjs/common'
import { OtpPurpose, UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { OtpInvalidException } from './exceptions/otp-invalid.exception'
import { OtpExpiredException } from './exceptions/otp-expired.exception'
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception'
import type { RequestContext } from './auth.service'
import { isDemoOtp } from './auth.constants'
import { OtpService } from './otp.service'
import { MailerService } from './mailer.service'

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  async verifyEmail(email: string, code: string, ctx: RequestContext = {}): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản hoặc mã OTP không hợp lệ')
    if (user.emailVerifiedAt) throw new EmailAlreadyVerifiedException()

    const result = isDemoOtp(code)
      ? 'valid'
      : await this.otp.verify(user.userId, OtpPurpose.email_verify, code)
    if (result === 'missing') throw new NotFoundException('Không tìm thấy mã OTP, vui lòng yêu cầu gửi lại')
    if (result === 'expired' || result === 'locked') throw new OtpExpiredException()
    if (result === 'invalid') {
      await this.audit.log({
        actorUserId: user.userId, action: 'auth.email-verify', resourceType: 'auth', resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'invalid_otp' }, ipAddress: ctx.ip, userAgent: ctx.userAgent,
      })
      throw new OtpInvalidException()
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { userId: user.userId }, data: { status: UserStatus.active, emailVerifiedAt: new Date() } })
      if (isDemoOtp(code)) await tx.otpCode.deleteMany({ where: { userId: user.userId, purpose: OtpPurpose.email_verify } })
    })
    await this.audit.log({
      actorUserId: user.userId, action: 'auth.email-verify', resourceType: 'auth', resourceId: user.userId.toString(),
      afterData: { success: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent,
    })
  }

  async resendVerify(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const message = 'Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi'
    const user = await this.users.findByEmailWithRoles(email)
    if (!user || user.emailVerifiedAt) return { message }
    const code = await this.otp.issue(user.userId, OtpPurpose.email_verify)
    if (!code) {
      await this.audit.log({ actorUserId: user.userId, action: 'auth.email-verify', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'resend', rate_limited: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
      return { message }
    }
    try {
      await this.mailer.sendOtp(user.email, OtpPurpose.email_verify, code)
    } catch {
      await this.audit.log({ actorUserId: user.userId, action: 'auth.email-verify', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'resend', delivery_failed: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
      return { message }
    }
    await this.audit.log({ actorUserId: user.userId, action: 'auth.email-verify', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'resend' }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
    return { message }
  }
}
