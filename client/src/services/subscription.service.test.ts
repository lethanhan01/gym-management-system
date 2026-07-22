import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import subscriptionService, { InvalidSubscriptionResponseError } from './subscription.service'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)

describe('subscriptionService.getByMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a validated subscription array and forwards timeout', async () => {
    const subscriptions = [makeSubscription()]
    mockedGet.mockResolvedValue({ data: { success: true, data: subscriptions } })

    await expect(subscriptionService.getByMember('10', { timeout: 30_000 })).resolves.toEqual(
      subscriptions
    )
    expect(mockedGet).toHaveBeenCalledWith('/subscriptions/member/10', { timeout: 30_000 })
  })

  it('forwards bootstrap auth options without relying on the stored token', async () => {
    const subscriptions = [makeSubscription()]
    mockedGet.mockResolvedValue({ data: { success: true, data: subscriptions } })

    await expect(
      subscriptionService.getByMember('10', {
        accessToken: 'fresh-token',
        timeout: 30_000,
        suppressAuthRedirect: true,
      })
    ).resolves.toEqual(subscriptions)

    expect(mockedGet).toHaveBeenCalledWith('/subscriptions/member/10', {
      timeout: 30_000,
      suppressAuthRedirect: true,
      headers: { Authorization: 'Bearer fresh-token' },
    })
  })

  it.each([
    '<!doctype html><html></html>',
    { success: true },
    { success: false, data: [] },
    { success: true, data: {} },
  ])('rejects malformed API payload %#', async (data) => {
    mockedGet.mockResolvedValue({ data })

    await expect(subscriptionService.getByMember('10')).rejects.toBeInstanceOf(
      InvalidSubscriptionResponseError
    )
  })
})
