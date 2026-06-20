import api from './api'
import { type PaymentMethod } from './payment.service'

export interface PaymentAccount {
  accountId: number
  memberId: string
  type: PaymentMethod
  provider: string | null
  accountRef: string | null
  label: string | null
  isDefault: boolean
  createdAt: string
}

export interface CreatePaymentAccountPayload {
  type: PaymentMethod
  provider?: string
  accountRef?: string
  label?: string
  isDefault?: boolean
}

const paymentAccountService = {
  list: async (memberId: string | number): Promise<PaymentAccount[]> => {
    const res = await api.get<{ accounts: PaymentAccount[] }>(
      `/members/${memberId}/payment-accounts`,
    )
    return res.data.accounts
  },

  create: async (memberId: string | number, payload: CreatePaymentAccountPayload): Promise<PaymentAccount> => {
    const res = await api.post<{ account: PaymentAccount }>(
      `/members/${memberId}/payment-accounts`,
      payload,
    )
    return res.data.account
  },

  remove: async (memberId: string | number, accountId: number): Promise<void> => {
    await api.delete(`/members/${memberId}/payment-accounts/${accountId}`)
  },

  setDefault: async (memberId: string | number, accountId: number): Promise<PaymentAccount> => {
    const res = await api.patch<{ account: PaymentAccount }>(
      `/members/${memberId}/payment-accounts/${accountId}`,
      { isDefault: true },
    )
    return res.data.account
  },
}

export default paymentAccountService
