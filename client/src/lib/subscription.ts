import type { Subscription } from '@/services/subscription.service'

export const GYM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

type SubscriptionAccessCandidate = Pick<Subscription, 'status' | 'endDate'>

function datePartsInGymTimeZone(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: GYM_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )
}

export function gymDateKey(date = new Date()): string {
  const parts = datePartsInGymTimeZone(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function subscriptionEndDateKey(value: string): string | null {
  const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1]
  if (dateOnly) return dateOnly

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : gymDateKey(parsed)
}

export function isSubscriptionActive(
  subscription: SubscriptionAccessCandidate,
  now = new Date()
): boolean {
  if (subscription.status !== 'active') return false
  const endDate = subscriptionEndDateKey(subscription.endDate)
  return endDate !== null && endDate >= gymDateKey(now)
}

export function hasActiveSubscription(
  subscriptions: SubscriptionAccessCandidate[],
  now = new Date()
): boolean {
  return subscriptions.some((subscription) => isSubscriptionActive(subscription, now))
}
