import type { Subscription } from '@/services/subscription.service'

export function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    subscriptionId: '1',
    memberId: '10',
    packageId: '20',
    packageName: 'Standard',
    package: {
      packageId: '20',
      packageCode: 'STANDARD',
      name: 'Standard',
      durationDays: 30,
      price: '500000.00',
      status: 'active',
    },
    trainerId: null,
    trainerName: null,
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-30T00:00:00.000Z',
    status: 'active',
    daysLeft: 9,
    cancelledAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}
