import type { Subscription } from '@/services/subscription.service'

export class InvalidSubscriptionResponseError extends Error {
  constructor() {
    super('Subscription API returned an invalid response')
    this.name = 'InvalidSubscriptionResponseError'
  }
}

export function parseSubscriptionListResponse(value: unknown): Subscription[] {
  const response = value as { success?: unknown; data?: unknown } | null
  if (!response || response.success !== true || !Array.isArray(response.data)) {
    throw new InvalidSubscriptionResponseError()
  }
  return response.data as Subscription[]
}
