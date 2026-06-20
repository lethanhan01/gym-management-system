import api from './api'

export interface Trainer {
  staffId: string
  fullName: string
  position: string
}

const trainerService = {
  list: async (): Promise<Trainer[]> => {
    const res = await api.get<{ success: boolean; data: Trainer[] }>('/staff/trainers')
    return res.data.data
  },
}

export default trainerService
