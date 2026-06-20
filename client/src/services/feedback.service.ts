import api from './api'

export interface Feedback {
  feedbackId: string
  memberId: string
  feedbackType: 'staff' | 'equipment' | 'service'
  content: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'
  subjectStaffId: string | null
  subjectStaffName: string | null
  subjectEquipmentId: string | null
  handledByStaffId: string | null
  handledAt: string | null
  response: string | null
  createdAt: string
}

export interface CreateFeedbackDto {
  memberId: string
  feedbackType: 'staff' | 'equipment' | 'service'
  content: string
  severity: 'low' | 'medium' | 'high'
  subjectStaffId?: string
  subjectEquipmentId?: string
}

export const feedbackService = {
  list: async (params: {
    memberId?: string
    feedbackType?: string
    status?: string
    sort?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Feedback[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: Feedback[]; meta?: { totalItems: number } }>(
      '/feedback',
      { params },
    )
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },

  getById: async (feedbackId: string): Promise<Feedback> => {
    const res = await api.get<{ success: boolean; data: Feedback }>(`/feedback/${feedbackId}`)
    return res.data.data
  },

  create: async (data: CreateFeedbackDto): Promise<Feedback> => {
    const res = await api.post<{ success: boolean; data: Feedback }>('/feedback', data)
    return res.data.data
  },

  updateStatus: async (
    feedbackId: string,
    data: { status: string; resolutionNote?: string }
  ): Promise<Feedback> => {
    const res = await api.patch<{ success: boolean; data: Feedback }>(`/feedback/${feedbackId}/status`, data)
    return res.data.data
  },

  delete: async (feedbackId: string): Promise<void> => {
    await api.delete(`/feedback/${feedbackId}`)
  },
}
