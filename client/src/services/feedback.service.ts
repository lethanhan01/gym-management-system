import api from './api'

export interface FeedbackMemberInfo {
  memberId: string
  memberCode: string
  fullName: string
}

export interface Feedback {
  feedbackId: string
  memberId: string
  memberCode?: string
  member?: FeedbackMemberInfo
  feedbackType: 'staff' | 'facility' | 'equipment' | 'service'
  content: string
  rating: number
  tags: string[]
  isAnonymous: boolean
  imageUrls: string[]
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'
  subjectStaffId: string | null
  subjectStaffName: string | null
  subjectEquipmentId: string | null
  subjectEquipmentName: string | null
  subjectRoomId: string | null
  subjectRoomName: string | null
  sessionId: string | null
  handledByStaffId: string | null
  handledAt: string | null
  response: string | null
  createdAt: string
}

export interface CreateFeedbackDto {
  memberId?: string
  feedbackType: 'staff' | 'facility' | 'equipment' | 'service'
  content: string
  rating?: number
  tags?: string[]
  isAnonymous?: boolean
  imageUrls?: string[]
  severity?: 'low' | 'medium' | 'high'
  subjectStaffId?: string
  subjectEquipmentId?: string
  subjectRoomId?: string
  sessionId?: string
}

export interface FeedbackTrainerOption {
  staffId: string
  staffCode: string
  fullName: string
  phone?: string | null
}

export interface FeedbackSessionOption {
  sessionId: string
  trainerStaffId: string
  trainerName: string
  roomName: string
  startTime: string
  endTime: string
}

export interface FeedbackRoomOption {
  roomId: string
  roomCode: string
  name: string
  roomType?: string | null
}

export interface FeedbackEquipmentOption {
  equipmentId: string
  equipmentCode: string
  name: string
  roomId: string
}

export interface FeedbackOptions {
  trainers: {
    assigned: FeedbackTrainerOption[]
    all: FeedbackTrainerOption[]
  }
  recentSessions: FeedbackSessionOption[]
  rooms: FeedbackRoomOption[]
  equipment: FeedbackEquipmentOption[]
  quickTags: {
    staff: { positive: string[]; negative: string[] }
    facility: { positive: string[]; negative: string[] }
  }
}

export const feedbackService = {
  list: async (params: {
    memberId?: string
    feedbackType?: string
    rating?: number
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

  getOptions: async (): Promise<FeedbackOptions> => {
    const res = await api.get<{ success: boolean; data: FeedbackOptions }>('/feedback/options')
    return res.data.data
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
    data: { status: string; resolutionNote?: string; severity?: string }
  ): Promise<Feedback> => {
    const res = await api.patch<{ success: boolean; data: Feedback }>(`/feedback/${feedbackId}/status`, data)
    return res.data.data
  },

  delete: async (feedbackId: string): Promise<void> => {
    await api.delete(`/feedback/${feedbackId}`)
  },
}
