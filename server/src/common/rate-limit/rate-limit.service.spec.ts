import { RateLimitService } from './rate-limit.service'

describe('RateLimitService', () => {
  let service: RateLimitService
  const key = 'forgot-password:user@example.com'

  beforeEach(() => {
    service = new RateLimitService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('isAllowed', () => {
    it('allows the first request when no prior requests exist', () => {
      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
    })

    it('allows requests up to the limit', () => {
      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
    })

    it('blocks the request that would exceed the limit', () => {
      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)

      expect(service.isAllowed(key, 3, 3_600_000)).toBe(false)
    })

    it('tracks different keys independently', () => {
      const keyA = 'forgot-password:a@example.com'
      const keyB = 'forgot-password:b@example.com'

      service.isAllowed(keyA, 1, 3_600_000)

      expect(service.isAllowed(keyA, 1, 3_600_000)).toBe(false)
      expect(service.isAllowed(keyB, 1, 3_600_000)).toBe(true)
    })

    it('allows requests again after the window expires', () => {
      jest.useFakeTimers()

      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)

      jest.advanceTimersByTime(3_600_001)

      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
    })

    it('sliding window: old timestamps outside the window are not counted', () => {
      jest.useFakeTimers()

      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)

      jest.advanceTimersByTime(3_600_001)

      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)

      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
    })

    it('with limit=1, first call is allowed and second is blocked', () => {
      expect(service.isAllowed(key, 1, 60_000)).toBe(true)
      expect(service.isAllowed(key, 1, 60_000)).toBe(false)
    })

    it('blocked call does not add a new timestamp to the store', () => {
      jest.useFakeTimers()

      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)
      service.isAllowed(key, 3, 3_600_000)

      jest.advanceTimersByTime(3_600_001)

      expect(service.isAllowed(key, 3, 3_600_000)).toBe(true)
    })

    it('request exactly at window boundary is expired (now - t < windowMs is false)', () => {
      jest.useFakeTimers()

      service.isAllowed(key, 1, 1_000)

      jest.advanceTimersByTime(1_000)

      expect(service.isAllowed(key, 1, 1_000)).toBe(true)
    })
  })
})
