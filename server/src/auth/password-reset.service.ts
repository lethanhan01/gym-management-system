import { Injectable, UnauthorizedException } from '@nestjs/common'
import { OtpPurpose } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import type { RequestContext } from './auth.service'
import { isDemoOtp } from './auth.constants'
import { OtpService } from './otp.service'
import { MailerService } from './mailer.service'

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  private readonly grantTtlMs = 10 * 60 * 1000

  private hashGrant(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  async forgotPassword(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const message = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi'
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) return { message }
    await this.prisma.passwordResetGrant.deleteMany({ where: { userId: user.userId } })
    const code = await this.otp.issue(user.userId, OtpPurpose.password_reset)
    if (!code) return { message }
    try {
      await this.mailer.sendOtp(user.email, OtpPurpose.password_reset, code)
    } catch {
      await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'request', delivery_failed: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
      return { message }
    }
    await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'request' }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
    return { message }
  }

  async verifyResetOtp(email: string, code: string, ctx: RequestContext = {}): Promise<string> {
    const invalid = 'OTP không hợp lệ hoặc đã hết hạn'
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new UnauthorizedException(invalid)
    const result = isDemoOtp(code) ? 'valid' : await this.otp.verify(user.userId, OtpPurpose.password_reset, code)
    if (result !== 'valid') throw new UnauthorizedException(invalid)
    if (isDemoOtp(code)) await this.otp.clear(user.userId, OtpPurpose.password_reset)

    const grant = randomBytes(32).toString('base64url')
    await this.prisma.passwordResetGrant.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, tokenHash: this.hashGrant(grant), expiresAt: new Date(Date.now() + this.grantTtlMs) },
      update: { tokenHash: this.hashGrant(grant), expiresAt: new Date(Date.now() + this.grantTtlMs) },
    })
    await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'verify_otp', success: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
    return grant
  }

  async resetPassword(grantToken: string | undefined, newPassword: string, ctx: RequestContext = {}): Promise<void> {
    const invalid = 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
    if (!grantToken) throw new UnauthorizedException(invalid)
    const tokenHash = this.hashGrant(grantToken)
    const grant = await this.prisma.passwordResetGrant.findUnique({ where: { tokenHash } })
    if (!grant || grant.expiresAt <= new Date()) {
      if (grant) await this.prisma.passwordResetGrant.deleteMany({ where: { passwordResetGrantId: grant.passwordResetGrantId } })
      throw new UnauthorizedException(invalid)
    }
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const consumed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.passwordResetGrant.deleteMany({
        where: { passwordResetGrantId: grant.passwordResetGrantId, tokenHash, expiresAt: { gt: new Date() } },
      })
      if (result.count !== 1) return false
      await tx.user.update({ where: { userId: grant.userId }, data: { passwordHash } })
      return true
    })
    if (!consumed) throw new UnauthorizedException(invalid)
    await this.audit.log({ actorUserId: grant.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: grant.userId.toString(), afterData: { step: 'complete', success: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
  }
}
