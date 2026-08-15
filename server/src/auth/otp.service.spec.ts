import bcrypt from 'bcryptjs'
import { OtpPurpose } from '@prisma/client'
import { OtpService } from './otp.service'

const tx = {
  otpRequestThrottle: { findUnique: jest.fn(), upsert: jest.fn() },
  otpCode: { upsert: jest.fn() },
}
const prisma = {
  $transaction: jest.fn(),
  otpCode: { findUnique: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
}

describe('OtpService', () => {
  let service: OtpService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new OtpService(prisma as any)
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx)
    )
    tx.otpRequestThrottle.findUnique.mockResolvedValue(null)
    tx.otpRequestThrottle.upsert.mockResolvedValue({})
    tx.otpCode.upsert.mockResolvedValue({})
  })

  it('persists a replacement OTP and throttle record', async () => {
    const code = await service.issue(1n, OtpPurpose.email_verify)

    expect(code).toMatch(/^\d{6}$/)
    expect(tx.otpCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_purpose: { userId: 1n, purpose: OtpPurpose.email_verify } },
        update: expect.objectContaining({ attemptCount: 0 }),
      })
    )
  })

  it('does not issue another OTP after the persistent rate limit', async () => {
    tx.otpRequestThrottle.findUnique.mockResolvedValue({
      windowStartedAt: new Date(),
      requestCount: 3,
    })

    await expect(service.issue(1n, OtpPurpose.password_reset)).resolves.toBeNull()
    expect(tx.otpCode.upsert).not.toHaveBeenCalled()
  })

  it('consumes a valid OTP exactly once', async () => {
    const hash = await bcrypt.hash('123456', 4)
    prisma.otpCode.findUnique.mockResolvedValue({
      otpCodeId: 7n,
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      codeHash: hash,
    })
    prisma.otpCode.deleteMany.mockResolvedValue({ count: 1 })

    await expect(service.verify(1n, OtpPurpose.email_verify, '123456')).resolves.toBe('valid')
    expect(prisma.otpCode.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ otpCodeId: 7n }) })
    )
  })
})
