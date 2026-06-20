import api from './api'

export interface OwnerProfile {
  userId: string
  email: string
  fullName: string
  phone: string | null
  status: string
  roles: string[]
}

export const ownerService = {
  getMe: async (): Promise<OwnerProfile> => {
    const res = await api.get<{ success: boolean; data: OwnerProfile }>('/auth/me')
    return res.data.data
  },
}
