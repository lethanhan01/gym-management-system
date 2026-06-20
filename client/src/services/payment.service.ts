import api from './api'

export type PaymentMethod = 'cash' | 'bank_card' | 'ewallet'
export type PaymentStatus = 'success' | 'failed'

export interface CreatePaymentPayload {
  memberId: number
  subscriptionId: number
  method: PaymentMethod
  amount: number
  transactionReference?: string
}

export interface Payment {
  paymentId: string
  memberId: string
  subscriptionId: string
  packageName: string
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  transactionReference: string | null
  paidAt: string
  canRefund?: boolean
  member?: {
    memberId: string
    memberCode: string
    fullName: string
  }
  service?: {
    subscriptionId: string
    packageId: string
    packageCode: string
    name: string
  }
  staff?: {
    staffId: string
    staffCode: string
    fullName: string
    source: 'subscription' | 'member'
  } | null
}

export interface ListPaymentsParams {
  page?: number
  pageSize?: number
  memberId?: string | number
  subscriptionId?: string | number
  status?: PaymentStatus
  method?: PaymentMethod
  from?: string
  to?: string
  sort?: string
}

export interface PaymentsMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PaymentsListResult {
  data: Payment[]
  meta: PaymentsMeta
}

const paymentService = {
  create: async (payload: CreatePaymentPayload) => {
    const res = await api.post<{ success: boolean; data: unknown }>('/payments', payload)
    return res.data
  },

  list: async (params: ListPaymentsParams = {}): Promise<PaymentsListResult> => {
    const res = await api.get<{ success: boolean; data: Payment[]; meta: PaymentsMeta }>(
      '/payments',
      { params },
    )
    return { data: res.data.data, meta: res.data.meta }
  },

  listByMember: async (memberId: string): Promise<Payment[]> => {
    const res = await paymentService.list({ memberId, pageSize: 100 })
    return res.data
  },
}

export default paymentService
