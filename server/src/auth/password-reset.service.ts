import { Injectable, UnauthorizedException } from '@nestjs/common'
import { OtpPurpose } from '@prisma/client'
import bcrypt from 'bcryptjs'
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

  async forgotPassword(email: string, ctx: RequestContext = {}): Promise<{ message: string; devOtp?: string }> {
    const message = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi'
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) return { message }
    const code = await this.otp.issue(user.userId, OtpPurpose.password_reset)
    if (!code) return { message }
    try {
      await this.mailer.sendOtp(user.email, OtpPurpose.password_reset, code)
    } catch {
      await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'request', delivery_failed: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
      return { message }
    }
    await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'request' }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
    const devOtp = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? code : undefined
    return { message, ...(devOtp && { devOtp }) }
  }

  async resetPassword(email: string, code: string, newPassword: string, ctx: RequestContext = {}): Promise<void> {
    const invalid = 'OTP không hợp lệ hoặc đã hết hạn'
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new UnauthorizedException(invalid)
    const result = isDemoOtp(code) ? 'valid' : await this.otp.verify(user.userId, OtpPurpose.password_reset, code)
    if (result !== 'valid') throw new UnauthorizedException(invalid)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { userId: user.userId }, data: { passwordHash } })
      if (isDemoOtp(code)) await tx.otpCode.deleteMany({ where: { userId: user.userId, purpose: OtpPurpose.password_reset } })
    })
    await this.audit.log({ actorUserId: user.userId, action: 'auth.password-reset', resourceType: 'auth', resourceId: user.userId.toString(), afterData: { step: 'complete', success: true }, ipAddress: ctx.ip, userAgent: ctx.userAgent })
  }
}
