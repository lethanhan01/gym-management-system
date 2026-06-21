import { beforeEach, describe, expect, it, vi } from 'vitest'
import subscriptionService, { InvalidSubscriptionResponseError } from '@/services/subscription.service'
import { makeSubscription } from '@/test/subscriptionFactory'
import {
  classifySubscriptionCheckError,
  useSubscriptionStore,
} from './subscriptionStore'

vi.mock('@/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/subscription.service')>(
    '@/services/subscription.service'
  )
  return {
    ...actual,
    default: {
      ...actual.default,
      getByMember: vi.fn(),
    },
  }
})

const mockedGetByMember = vi.mocked(subscriptionService.getByMember)

function axiosError(options: { code?: string; status?: number } = {}) {
  return {
    isAxiosError: true,
    code: options.code,
    response: options.status === undefined ? undefined : { status: options.status },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('subscriptionStore', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useSubscriptionStore.getState().clear()
  })

  it('moves from loading to a successful active result', async () => {
    mockedGetByMember.mockResolvedValue([makeSubscription({ endDate: '2099-01-01' })])

    const promise = useSubscriptionStore.getState().check('10')
    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'loading',
      checkedMemberId: '10',
    })

    await expect(promise).resolves.toMatchObject({ hasActiveSub: true })
    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: true,
      errorCode: null,
    })
  })

  it.each([
    ['timeout', axiosError({ code: 'ECONNABORTED' })],
    ['network failure', axiosError()],
    ['HTTP 503', axiosError({ status: 503 })],
  ])('retries a transient %s exactly once and then succeeds', async (_label, error) => {
    vi.useFakeTimers()
    mockedGetByMember
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([makeSubscription({ endDate: '2099-01-01' })])

    const promise = useSubscriptionStore.getState().check('10')
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(promise).resolves.toMatchObject({ hasActiveSub: true })
    expect(mockedGetByMember).toHaveBeenCalledTimes(2)
  })

  it.each([400, 403])('does not retry an HTTP %s response', async (status) => {
    mockedGetByMember.mockRejectedValue(axiosError({ status }))

    await expect(useSubscriptionStore.getState().check('10')).rejects.toBeDefined()
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
    expect(useSubscriptionStore.getState().status).toBe('error')
    expect(useSubscriptionStore.getState().hasActiveSub).toBeNull()
    expect(useSubscriptionStore.getState().errorCode).toBe(status === 403 ? 'forbidden' : 'unknown')
  })

  it('does not retry an invalid API response', async () => {
    mockedGetByMember.mockRejectedValue(new InvalidSubscriptionResponseError())

    await expect(useSubscriptionStore.getState().check('10')).rejects.toBeInstanceOf(
      InvalidSubscriptionResponseError
    )
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
    expect(useSubscriptionStore.getState().errorCode).toBe('invalid_response')
  })

  it('deduplicates concurrent checks for the same member', async () => {
    const request = deferred<ReturnType<typeof makeSubscription>[]>()
    mockedGetByMember.mockReturnValue(request.promise)

    const first = useSubscriptionStore.getState().check('10')
    const second = useSubscriptionStore.getState().check('10')
    expect(first).toBe(second)
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)

    request.resolve([makeSubscription({ endDate: '2099-01-01' })])
    await first
  })

  it('ignores a stale response after clear', async () => {
    const request = deferred<ReturnType<typeof makeSubscription>[]>()
    mockedGetByMember.mockReturnValue(request.promise)

    const promise = useSubscriptionStore.getState().check('10')
    useSubscriptionStore.getState().clear()
    request.resolve([makeSubscription({ endDate: '2099-01-01' })])
    await promise

    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'idle',
      hasActiveSub: null,
      checkedMemberId: null,
    })
  })

  it('does not let an older member response overwrite a newer member check', async () => {
    const firstRequest = deferred<ReturnType<typeof makeSubscription>[]>()
    mockedGetByMember
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce([makeSubscription({ memberId: '20', endDate: '2099-01-01' })])

    const first = useSubscriptionStore.getState().check('10')
    const second = useSubscriptionStore.getState().check('20')
    await second
    firstRequest.resolve([makeSubscription({ memberId: '10', status: 'expired' })])
    await first

    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: true,
      checkedMemberId: '20',
    })
  })

  it('maps network and service failures without leaking response details', () => {
    expect(classifySubscriptionCheckError(axiosError())).toBe('network')
    expect(classifySubscriptionCheckError(axiosError({ status: 503 }))).toBe(
      'service_unavailable'
    )
    expect(classifySubscriptionCheckError(new Error('boom'))).toBe('unknown')
  })

  it('retries the last checked member on demand', async () => {
    useSubscriptionStore.getState().setError('network', '10')
    mockedGetByMember.mockResolvedValue([makeSubscription({ endDate: '2099-01-01' })])

    await expect(useSubscriptionStore.getState().retry()).resolves.toMatchObject({
      hasActiveSub: true,
    })
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
  })

  it('rejects retry when no member context exists', async () => {
    await expect(useSubscriptionStore.getState().retry()).rejects.toThrow(
      'No member is available to retry'
    )
  })

  it('accepts authoritative mutation results without a network lookup', () => {
    useSubscriptionStore.getState().setResolvedStatus(true, '10')

    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: true,
      errorCode: null,
      checkedMemberId: '10',
    })
    expect(mockedGetByMember).not.toHaveBeenCalled()
  })
})
