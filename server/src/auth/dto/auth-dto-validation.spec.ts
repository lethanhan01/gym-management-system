import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ForgotPasswordDto } from './forgot-password.dto'
import { LoginDto } from './login.dto'
import { ResetPasswordDto } from './reset-password.dto'
import { VerifyEmailDto } from './verify-email.dto'

describe('LoginDto', () => {
  it('accepts valid email and password', async () => {
    const dto = plainToInstance(LoginDto, { email: 'user@gym.local', password: 'Password123!' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing email', async () => {
    const dto = plainToInstance(LoginDto, { password: 'Password123!' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejects invalid email format', async () => {
    const dto = plainToInstance(LoginDto, { email: 'not-an-email', password: 'Password123!' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejects password shorter than 8 characters', async () => {
    const dto = plainToInstance(LoginDto, { email: 'user@gym.local', password: 'short' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'password')).toBe(true)
  })

  it('rejects missing password', async () => {
    const dto = plainToInstance(LoginDto, { email: 'user@gym.local' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'password')).toBe(true)
  })
})

describe('ForgotPasswordDto', () => {
  it('accepts valid email', async () => {
    const dto = plainToInstance(ForgotPasswordDto, { email: 'user@gym.local' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing email', async () => {
    const dto = plainToInstance(ForgotPasswordDto, {})
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejects invalid email format', async () => {
    const dto = plainToInstance(ForgotPasswordDto, { email: 'notanemail' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })
})

describe('ResetPasswordDto', () => {
  const valid = { email: 'user@gym.local', otp: '123456', newPassword: 'NewPass1!' }

  it('accepts valid email, 6-char otp, and password of 8+ chars', async () => {
    const dto = plainToInstance(ResetPasswordDto, valid)
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing email', async () => {
    const dto = plainToInstance(ResetPasswordDto, { otp: '123456', newPassword: 'NewPass1!' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejects missing otp', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      email: 'user@gym.local',
      newPassword: 'NewPass1!',
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'otp')).toBe(true)
  })

  it('rejects otp shorter than 6 characters', async () => {
    const dto = plainToInstance(ResetPasswordDto, { ...valid, otp: '12345' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'otp')).toBe(true)
  })

  it('rejects otp longer than 6 characters', async () => {
    const dto = plainToInstance(ResetPasswordDto, { ...valid, otp: '1234567' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'otp')).toBe(true)
  })

  it('rejects newPassword shorter than 8 characters', async () => {
    const dto = plainToInstance(ResetPasswordDto, { ...valid, newPassword: 'short' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true)
  })
})

describe('VerifyEmailDto', () => {
  it('accepts valid email and 6-char otp', async () => {
    const dto = plainToInstance(VerifyEmailDto, { email: 'user@gym.local', otp: '654321' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing email', async () => {
    const dto = plainToInstance(VerifyEmailDto, { otp: '654321' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejects missing otp', async () => {
    const dto = plainToInstance(VerifyEmailDto, { email: 'user@gym.local' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'otp')).toBe(true)
  })

  it('rejects otp with wrong length', async () => {
    const dto = plainToInstance(VerifyEmailDto, { email: 'user@gym.local', otp: '12345' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'otp')).toBe(true)
  })
})
