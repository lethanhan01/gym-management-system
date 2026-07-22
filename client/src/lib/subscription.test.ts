import { describe, expect, it } from 'vitest'
import {
  gymDateKey,
  hasActiveSubscription,
  isSubscriptionActive,
  subscriptionEndDateKey,
} from './subscription'

describe('subscription access date rules', () => {
  const now = new Date('2026-06-20T17:30:00.000Z') // 2026-06-21 in Vietnam

  it('uses the Asia/Ho_Chi_Minh business date', () => {
    expect(gymDateKey(now)).toBe('2026-06-21')
  })

  it('keeps an active subscription valid through its end date', () => {
    expect(isSubscriptionActive({ status: 'active', endDate: '2026-06-22' }, now)).toBe(true)
    expect(isSubscriptionActive({ status: 'active', endDate: '2026-06-21' }, now)).toBe(true)
    expect(isSubscriptionActive({ status: 'active', endDate: '2026-06-20' }, now)).toBe(false)
  })

  it('rejects inactive statuses and invalid dates', () => {
    expect(isSubscriptionActive({ status: 'expired', endDate: '2026-06-30' }, now)).toBe(false)
    expect(isSubscriptionActive({ status: 'active', endDate: 'not-a-date' }, now)).toBe(false)
    expect(subscriptionEndDateKey('not-a-date')).toBeNull()
  })

  it('accepts ISO timestamps and finds any active subscription', () => {
    expect(subscriptionEndDateKey('2026-06-21T00:00:00.000Z')).toBe('2026-06-21')
    expect(
      hasActiveSubscription(
        [
          { status: 'expired', endDate: '2026-06-30' },
          { status: 'active', endDate: '2026-06-22T00:00:00.000Z' },
        ],
        now
      )
    ).toBe(true)
  })
})
