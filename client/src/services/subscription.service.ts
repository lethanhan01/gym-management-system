import api from './api'
import { parseSubscriptionListResponse } from '@/lib/subscriptionResponse'

export { InvalidSubscriptionResponseError } from '@/lib/subscriptionResponse'

export interface SubscriptionRequestOptions {
  timeout?: number
  accessToken?: string
  suppressAuthRedirect?: boolean
}

export interface Subscription {
  subscriptionId: string
  memberId: string
  packageId: string
  packageName: string | null
  package: {
    packageId: string
    packageCode: string | null
    name: string
    durationDays: number
    price: string
    status: 'active' | 'inactive' | null
  } | null
  trainerId: string | null
  trainerName: string | null
  startDate: string
  endDate: string
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  daysLeft: number | null
  cancelledAt: string | null
  createdAt: string
}

const subscriptionService = {
  getByMember: async (
    memberId: string,
    options: SubscriptionRequestOptions = {}
  ): Promise<Subscription[]> => {
    const config = {
      ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
      ...(options.suppressAuthRedirect !== undefined
        ? { suppressAuthRedirect: options.suppressAuthRedirect }
        : {}),
      ...(options.accessToken
        ? { headers: { Authorization: `Bearer ${options.accessToken}` } }
        : {}),
    }

    const res = await api.get<{ success: boolean; data: Subscription[] }>(
      `/subscriptions/member/${memberId}`,
      config
    )
    return parseSubscriptionListResponse(res.data)
  },

  create: async (
    memberId: string,
    packageId: string,
    trainerId?: string
  ): Promise<Subscription> => {
    const res = await api.post<{ success: boolean; data: Subscription }>('/subscriptions', {
      memberId: Number(memberId),
      packageId: Number(packageId),
      ...(trainerId ? { trainerId: Number(trainerId) } : {}),
    })
    return res.data.data
  },

  cancel: async (
    subscriptionId: string
  ): Promise<{ subscriptionId: string; status: string; cancelledAt: string; endDate: string }> => {
    const res = await api.patch<{
      success: boolean
      data: { subscriptionId: string; status: string; cancelledAt: string; endDate: string }
    }>(`/subscriptions/${subscriptionId}/cancel`)
    return res.data.data
  },

  renew: async (
    subscriptionId: string,
    payment: { method: string; transactionReference?: string }
  ): Promise<Subscription> => {
    const res = await api.post<{ success: boolean; data: Subscription }>(
      `/subscriptions/${subscriptionId}/renew`,
      payment
    )
    return res.data.data
  },

  get: async (subscriptionId: string): Promise<Subscription> => {
    const res = await api.get<{ success: boolean; data: Subscription }>(
      `/subscriptions/${subscriptionId}`
    )
    return res.data.data
  },
}

export default subscriptionService
