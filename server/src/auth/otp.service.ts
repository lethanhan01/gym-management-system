import { Injectable } from '@nestjs/common'
import { OtpPurpose } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { OTP_MAX_ATTEMPTS, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS, OTP_TTL_MS } from './auth.constants'

export type OtpCheckResult = 'valid' | 'missing' | 'expired' | 'invalid' | 'locked'

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: bigint, purpose: OtpPurpose): Promise<string | null> {
    const now = new Date()
    const otp = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(otp, 10)
    const accepted = await this.prisma.$transaction(async (tx) => {
      const throttle = await tx.otpRequestThrottle.findUnique({ where: { userId_purpose: { userId, purpose } } })
      const inWindow = throttle && now.getTime() - throttle.windowStartedAt.getTime() < OTP_RATE_WINDOW_MS
      const count = inWindow ? throttle.requestCount : 0
      if (count >= OTP_RATE_LIMIT) return false
      await tx.otpRequestThrottle.upsert({
        where: { userId_purpose: { userId, purpose } },
        create: { userId, purpose, windowStartedAt: now, requestCount: 1 },
        update: inWindow
          ? { requestCount: { increment: 1 } }
          : { windowStartedAt: now, requestCount: 1 },
      })
      await tx.otpCode.upsert({
        where: { userId_purpose: { userId, purpose } },
        create: { userId, purpose, codeHash, expiresAt: new Date(now.getTime() + OTP_TTL_MS) },
        update: { codeHash, expiresAt: new Date(now.getTime() + OTP_TTL_MS), attemptCount: 0 },
      })
      return true
    })
    return accepted ? otp : null
  }

  async verify(userId: bigint, purpose: OtpPurpose, otp: string): Promise<OtpCheckResult> {
    const entry = await this.prisma.otpCode.findUnique({ where: { userId_purpose: { userId, purpose } } })
    if (!entry) return 'missing'
    if (entry.expiresAt <= new Date()) {
      await this.prisma.otpCode.deleteMany({ where: { otpCodeId: entry.otpCodeId } })
      return 'expired'
    }
    const valid = await bcrypt.compare(otp, entry.codeHash)
    if (valid) {
      const consumed = await this.prisma.otpCode.deleteMany({
        where: { otpCodeId: entry.otpCodeId, expiresAt: { gt: new Date() } },
      })
      return consumed.count === 1 ? 'valid' : 'missing'
    }
    const attempts = entry.attemptCount + 1
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpCode.deleteMany({ where: { otpCodeId: entry.otpCodeId, attemptCount: entry.attemptCount } })
      return 'locked'
    }
    await this.prisma.otpCode.updateMany({
      where: { otpCodeId: entry.otpCodeId, attemptCount: entry.attemptCount },
      data: { attemptCount: { increment: 1 } },
    })
    return 'invalid'
  }

  async clear(userId: bigint, purpose: OtpPurpose): Promise<void> {
    await this.prisma.otpCode.deleteMany({ where: { userId, purpose } })
  }
}
