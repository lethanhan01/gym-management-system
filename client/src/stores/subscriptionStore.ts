import axios from 'axios'
import { create } from 'zustand'
import { hasActiveSubscription } from '@/lib/subscription'
import { InvalidSubscriptionResponseError } from '@/lib/subscriptionResponse'
import subscriptionService, { type Subscription } from '@/services/subscription.service'

export type SubscriptionCheckStatus = 'idle' | 'loading' | 'success' | 'error'

export type SubscriptionCheckErrorCode =
  | 'timeout'
  | 'network'
  | 'forbidden'
  | 'service_unavailable'
  | 'invalid_response'
  | 'missing_member_profile'
  | 'unknown'

export interface SubscriptionCheckResult {
  subscriptions: Subscription[]
  hasActiveSub: boolean
}

interface CheckOptions {
  force?: boolean
}

interface SubscriptionState {
  status: SubscriptionCheckStatus
  hasActiveSub: boolean | null
  errorCode: SubscriptionCheckErrorCode | null
  checkedMemberId: string | null
  check: (memberId: string, options?: CheckOptions) => Promise<SubscriptionCheckResult>
  retry: () => Promise<SubscriptionCheckResult>
  setResolvedStatus: (value: boolean, memberId?: string) => void
  setError: (code: SubscriptionCheckErrorCode, memberId?: string) => void
  clear: () => void
}

const ACCESS_CHECK_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 1_000
const TRANSIENT_HTTP_STATUSES = new Set([500, 502, 503, 504])

let generation = 0
let inFlight:
  | {
      memberId: string
      generation: number
      promise: Promise<SubscriptionCheckResult>
    }
  | undefined
let lastSuccessfulResult:
  | {
      memberId: string
      result: SubscriptionCheckResult
    }
  | undefined

export function classifySubscriptionCheckError(error: unknown): SubscriptionCheckErrorCode {
  if (error instanceof InvalidSubscriptionResponseError) return 'invalid_response'
  if (!axios.isAxiosError(error)) return 'unknown'

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout'

  const status = error.response?.status
  if (status === 403) return 'forbidden'
  if (status !== undefined && TRANSIENT_HTTP_STATUSES.has(status)) return 'service_unavailable'
  if (!error.response) return 'network'
  return 'unknown'
}

function isRetryable(code: SubscriptionCheckErrorCode): boolean {
  return code === 'timeout' || code === 'network' || code === 'service_unavailable'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithOneRetry(memberId: string): Promise<Subscription[]> {
  try {
    return await subscriptionService.getByMember(memberId, { timeout: ACCESS_CHECK_TIMEOUT_MS })
  } catch (error) {
    if (!isRetryable(classifySubscriptionCheckError(error))) throw error
    await wait(RETRY_DELAY_MS)
    return subscriptionService.getByMember(memberId, { timeout: ACCESS_CHECK_TIMEOUT_MS })
  }
}

const initialState = {
  status: 'idle' as const,
  hasActiveSub: null,
  errorCode: null,
  checkedMemberId: null,
}

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  ...initialState,

  check: (memberId, options = {}) => {
    const normalizedMemberId = String(memberId).trim()
    const current = get()

    if (!options.force && current.status === 'success' && current.checkedMemberId === normalizedMemberId) {
      const cached = lastSuccessfulResult
      if (cached?.memberId === normalizedMemberId) return Promise.resolve(cached.result)
    }

    if (inFlight?.memberId === normalizedMemberId) return inFlight.promise

    const requestGeneration = ++generation
    set({
      status: 'loading',
      hasActiveSub: null,
      errorCode: null,
      checkedMemberId: normalizedMemberId,
    })

    const promise = fetchWithOneRetry(normalizedMemberId)
      .then((subscriptions) => {
        const result = {
          subscriptions,
          hasActiveSub: hasActiveSubscription(subscriptions),
        }
        if (requestGeneration === generation) {
          lastSuccessfulResult = { memberId: normalizedMemberId, result }
          set({
            status: 'success',
            hasActiveSub: result.hasActiveSub,
            errorCode: null,
            checkedMemberId: normalizedMemberId,
          })
        }
        return result
      })
      .catch((error: unknown) => {
        if (requestGeneration === generation) {
          lastSuccessfulResult = undefined
          set({
            status: 'error',
            hasActiveSub: null,
            errorCode: classifySubscriptionCheckError(error),
            checkedMemberId: normalizedMemberId,
          })
        }
        throw error
      })
      .finally(() => {
        if (inFlight?.generation === requestGeneration) inFlight = undefined
      })

    inFlight = { memberId: normalizedMemberId, generation: requestGeneration, promise }
    return promise
  },

  retry: () => {
    const memberId = get().checkedMemberId
    if (!memberId) return Promise.reject(new Error('No member is available to retry'))
    return get().check(memberId, { force: true })
  },

  setResolvedStatus: (value, memberId) => {
    generation += 1
    inFlight = undefined
    lastSuccessfulResult = undefined
    set({
      status: 'success',
      hasActiveSub: value,
      errorCode: null,
      checkedMemberId: memberId ?? get().checkedMemberId,
    })
  },

  setError: (code, memberId) => {
    generation += 1
    inFlight = undefined
    lastSuccessfulResult = undefined
    set({
      status: 'error',
      hasActiveSub: null,
      errorCode: code,
      checkedMemberId: memberId ?? get().checkedMemberId,
    })
  },

  clear: () => {
    generation += 1
    inFlight = undefined
    lastSuccessfulResult = undefined
    set(initialState)
  },
}))
