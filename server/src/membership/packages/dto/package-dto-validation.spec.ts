import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateSubscriptionDto } from '../../subscriptions/dto/create-subscription.dto'
import { CreatePackageDto } from './create-package.dto'
import { UpdatePackageDto } from './update-package.dto'

describe('CreatePackageDto', () => {
  const valid = { name: 'Gói tháng', durationDays: 30, price: 500000 }

  it('accepts valid name, durationDays, and price', async () => {
    const dto = plainToInstance(CreatePackageDto, valid)
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing name', async () => {
    const dto = plainToInstance(CreatePackageDto, { durationDays: 30, price: 500000 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'name')).toBe(true)
  })

  it('rejects negative price', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, price: -1 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'price')).toBe(true)
  })

  it('rejects zero price', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, price: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'price')).toBe(true)
  })

  it('rejects durationDays of 0', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, durationDays: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'durationDays')).toBe(true)
  })

  it('rejects durationDays exceeding 3650', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, durationDays: 3651 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'durationDays')).toBe(true)
  })

  it('rejects packageCode not matching PKG-XXXX pattern', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, packageCode: 'INVALID' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'packageCode')).toBe(true)
  })

  it('accepts valid packageCode matching PKG-XXXX pattern', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...valid, packageCode: 'PKG-A1B2' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })
})

describe('UpdatePackageDto', () => {
  it('accepts empty object — all fields are optional', async () => {
    const dto = plainToInstance(UpdatePackageDto, {})
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('accepts partial update with only name provided', async () => {
    const dto = plainToInstance(UpdatePackageDto, { name: 'Gói mới' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects negative price in partial update', async () => {
    const dto = plainToInstance(UpdatePackageDto, { price: -100 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'price')).toBe(true)
  })

  it('rejects durationDays of 0 in partial update', async () => {
    const dto = plainToInstance(UpdatePackageDto, { durationDays: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'durationDays')).toBe(true)
  })
})

describe('CreateSubscriptionDto', () => {
  it('accepts valid memberId and packageId', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { memberId: 1, packageId: 2 })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('accepts optional trainerId when provided', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { memberId: 1, packageId: 2, trainerId: 3 })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('rejects missing memberId', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { packageId: 2 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'memberId')).toBe(true)
  })

  it('rejects missing packageId', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { memberId: 1 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'packageId')).toBe(true)
  })

  it('rejects non-positive memberId', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { memberId: 0, packageId: 2 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'memberId')).toBe(true)
  })

  it('rejects non-positive trainerId when provided', async () => {
    const dto = plainToInstance(CreateSubscriptionDto, { memberId: 1, packageId: 2, trainerId: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'trainerId')).toBe(true)
  })
})
