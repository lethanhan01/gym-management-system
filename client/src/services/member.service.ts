import api from './api'

export interface MemberProfile {
  memberId: string
  memberCode: string
  userId: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string | null
  address: string | null
  primaryTrainerId: string | null
  trainerName: string | null
  primaryTrainer?: {
    staffId: string
    staffCode: string
    fullName: string
    phone: string | null
    email: string
  } | null
  createdAt: string
  subscriptions?: Array<{
    subscriptionId: string
    packageId: string
    packageName: string
    includesPt: boolean
    startDate: string
    endDate: string
    status: 'pending' | 'active' | 'expired' | 'cancelled'
    createdAt: string
  }>
}

export interface MemberProgress {
  progressId: string
  memberId: string
  weight: string | null
  bmi: string | null
  goal: string | null
  notes: string | null
  recordedAt: string
  staffId: string | null
  deletedAt?: string | null
}

export interface ActiveSubscriptionSummary {
  subscriptionId: string
  packageName: string
  endDate: string
  status: 'pending' | 'active' | 'expired' | 'cancelled'
}

export interface TrainerStudentSummary extends MemberProfile {
  status: string
  activeSubscription: ActiveSubscriptionSummary | null
}

export interface TrainerStudentDetail extends MemberProfile {
  status: string
  emailVerifiedAt: string | null
  avatarFileId: string | null
  primaryTrainer: {
    staffId: string
    staffCode: string
    fullName: string
    phone: string | null
    email: string
  } | null
  subscriptions: Array<{
    subscriptionId: string
    packageId: string
    packageName: string
    includesPt: boolean
    startDate: string
    endDate: string
    status: ActiveSubscriptionSummary['status']
    cancelledAt: string | null
    createdAt: string
  }>
}

export interface TrainerSummary {
  staffId: string
  staffCode: string
  fullName: string
  position: string
}

export interface ListMembersParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  subStatus?: 'active' | 'expired'
  sort?: string
}

export interface CreateMemberDto {
  fullName: string
  email: string
  password: string
  phone?: string
  dateOfBirth: string
  address?: string
  packageId: number
  paymentMethod: 'cash' | 'bank_card' | 'ewallet'
  transactionReference?: string
}

export interface CreateMemberResult {
  memberId: string
  memberCode: string
  fullName: string
  email: string
}

export interface CreateProgressDto {
  weight?: number
  bmi?: number
  goal?: string
  notes?: string
  recordedAt?: string
}

export const memberService = {
  list: async (
    params: ListMembersParams = {}
  ): Promise<{
    data: TrainerStudentSummary[]
    total: number
    page: number
    totalPages: number
  }> => {
    const res = await api.get<{
      success: boolean
      data: TrainerStudentSummary[]
      meta?: { page: number; totalItems: number; totalPages: number }
    }>('/members', { params })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
      page: res.data.meta?.page ?? params.page ?? 1,
      totalPages: res.data.meta?.totalPages ?? 1,
    }
  },

  getById: async (memberId: string): Promise<TrainerStudentDetail> => {
    const res = await api.get<{ success: boolean; data: TrainerStudentDetail }>(
      `/members/${memberId}`
    )
    return res.data.data
  },

  getProfile: async (_memberId: string): Promise<MemberProfile> => {
    const res = await api.get<{ success: boolean; data: MemberProfile }>('/members/me')
    return res.data.data
  },

  updateProfile: async (
    _memberId: string,
    data: Partial<Pick<MemberProfile, 'phone' | 'dateOfBirth' | 'address'>>
  ): Promise<MemberProfile> => {
    const res = await api.patch<{ success: boolean; data: MemberProfile }>('/members/me', data)
    return res.data.data
  },

  getProgress: async (
    memberId: string,
    params?: { from?: string; to?: string; limit?: number }
  ): Promise<MemberProgress[]> => {
    const res = await api.get<{ success: boolean; data: MemberProgress[] }>(
      `/members/${memberId}/progress`, // training controller: GET /members/:id/progress
      { params }
    )
    return res.data.data
  },

  createProgress: async (memberId: string, data: CreateProgressDto): Promise<MemberProgress> => {
    const res = await api.post<{ success: boolean; data: MemberProgress }>(
      `/members/${memberId}/progress`,
      data
    )
    return res.data.data
  },

  deleteProgress: async (progressId: string): Promise<void> => {
    await api.delete(`/member-progress/${progressId}`)
  },

  getAvailableTrainers: async (): Promise<TrainerSummary[]> => {
    const res = await api.get<{ success: boolean; data: TrainerSummary[] }>('/members/me/trainers')
    return res.data.data
  },

  selfAssignTrainer: async (
    trainerId: number | null
  ): Promise<{ primaryTrainerId: string | null; trainerName: string | null }> => {
    const res = await api.patch<{
      success: boolean
      data: { primaryTrainerId: string | null; trainerName: string | null }
    }>('/members/me/trainer', { trainerId })
    return res.data.data
  },

  recordSelfProgress: async (data: {
    weight: number
    height?: number
  }): Promise<MemberProgress> => {
    const res = await api.post<{ success: boolean; data: MemberProgress }>(
      '/members/me/progress',
      data
    )
    return res.data.data
  },

  createMember: async (data: CreateMemberDto): Promise<CreateMemberResult> => {
    const res = await api.post<{ success: boolean; data: CreateMemberResult }>('/members', data)
    return res.data.data
  },
}
