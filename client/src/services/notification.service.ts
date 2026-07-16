import api from './api'

export interface NotificationItem {
  notificationId: string
  recipientUserId: string
  type: string
  title: string
  message: string
  resourceType: string | null
  resourceId: string | null
  metadata: unknown
  readAt: string | null
  createdAt: string
  unread: boolean
}

interface ListResponse {
  success: boolean
  data: NotificationItem[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

interface CountResponse {
  success: boolean
  data: { count: number }
}

interface UpdateResponse {
  success: boolean
  data: { updated: number }
}

export const notificationService = {
  async list(params: { page?: number; pageSize?: number; status?: 'all' | 'unread' } = {}) {
    const res = await api.get<ListResponse>('/notifications', { params })
    return res.data
  },

  async listNew(afterId: string, limit = 20) {
    const res = await api.get<ListResponse>('/notifications/new', {
      params: { afterId, limit },
    })
    return res.data.data
  },

  async unreadCount() {
    const res = await api.get<CountResponse>('/notifications/unread-count')
    return res.data.data.count
  },

  async markRead(notificationId: string) {
    const res = await api.patch<UpdateResponse>(`/notifications/${notificationId}/read`)
    return res.data.data.updated
  },

  async markAllRead() {
    const res = await api.patch<UpdateResponse>('/notifications/read-all')
    return res.data.data.updated
  },
}
