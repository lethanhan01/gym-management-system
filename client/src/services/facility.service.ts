import api from './api'

export interface GymRoom {
  roomId: string
  roomCode: string
  name: string
  roomType: string | null
  capacity: number
  description: string | null
}

export interface Equipment {
  equipmentId: string
  equipmentCode: string
  name: string
  roomId: string | null
  roomName: string | null
  status: 'active' | 'repairing' | 'broken' | 'retired'
  importDate: string | null
  warrantyUntil: string | null
}

export interface MaintenanceLog {
  maintenanceId: string
  equipmentId: string
  reportedByStaff: { staffId: string; staffCode: string; fullName: string } | null
  description: string
  status: 'reported' | 'repairing' | 'resolved' | 'failed'
  reportedAt: string
  resolvedAt: string | null
}

export interface CreateRoomDto {
  name: string
  roomType?: string
  capacity: number
  description?: string
}

export interface CreateEquipmentDto {
  name: string
  roomId?: string
  importDate?: string
  warrantyUntil?: string
}

export interface CreateMaintenanceLogDto {
  description: string
}

export const facilityService = {
  listRooms: async (params?: { search?: string; roomType?: string }): Promise<GymRoom[]> => {
    const res = await api.get<{ success: boolean; data: GymRoom[] }>('/rooms/lookup', {
      params: { ...params, pageSize: 100 },
    })
    return res.data.data
  },

  listRoomsPaged: async (params?: {
    search?: string
    roomType?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: GymRoom[]; total: number; totalPages: number }> => {
    const res = await api.get<{
      success: boolean
      data: GymRoom[]
      meta?: { totalItems: number; totalPages: number; page: number }
    }>('/rooms', { params })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
      totalPages: res.data.meta?.totalPages ?? 1,
    }
  },

  getRoom: async (roomId: string): Promise<GymRoom> => {
    const res = await api.get<{ success: boolean; data: GymRoom }>(`/rooms/${roomId}`)
    return res.data.data
  },

  createRoom: async (data: CreateRoomDto): Promise<GymRoom> => {
    const res = await api.post<{ success: boolean; data: GymRoom }>('/rooms', data)
    return res.data.data
  },

  updateRoom: async (roomId: string, data: Partial<CreateRoomDto>): Promise<GymRoom> => {
    const res = await api.patch<{ success: boolean; data: GymRoom }>(`/rooms/${roomId}`, data)
    return res.data.data
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}`)
  },

  listEquipment: async (params?: {
    roomId?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Equipment[]; total: number; totalPages: number }> => {
    const res = await api.get<{
      success: boolean
      data: Equipment[]
      meta?: { totalItems: number; totalPages: number }
    }>('/equipment', { params })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
      totalPages: res.data.meta?.totalPages ?? 1,
    }
  },

  getEquipment: async (equipmentId: string): Promise<Equipment> => {
    const res = await api.get<{ success: boolean; data: Equipment }>(`/equipment/${equipmentId}`)
    return res.data.data
  },

  createEquipment: async (data: CreateEquipmentDto): Promise<Equipment> => {
    const res = await api.post<{ success: boolean; data: Equipment }>('/equipment', data)
    return res.data.data
  },

  updateEquipment: async (
    equipmentId: string,
    data: Partial<CreateEquipmentDto & { status: string }>
  ): Promise<Equipment> => {
    const res = await api.patch<{ success: boolean; data: Equipment }>(
      `/equipment/${equipmentId}`,
      data
    )
    return res.data.data
  },

  deleteEquipment: async (equipmentId: string): Promise<void> => {
    await api.delete(`/equipment/${equipmentId}`)
  },

  listMaintenanceLogs: async (equipmentId: string): Promise<MaintenanceLog[]> => {
    const res = await api.get<{ success: boolean; data: MaintenanceLog[] }>(
      `/equipment/${equipmentId}/maintenance-logs`
    )
    return res.data.data
  },

  createMaintenanceLog: async (
    equipmentId: string,
    data: CreateMaintenanceLogDto
  ): Promise<MaintenanceLog> => {
    const res = await api.post<{ success: boolean; data: MaintenanceLog }>(
      `/equipment/${equipmentId}/maintenance-logs`,
      data
    )
    return res.data.data
  },

  resolveMaintenanceLog: async (
    logId: string,
    data: { notes?: string; status: 'repairing' | 'resolved' | 'failed' }
  ): Promise<MaintenanceLog> => {
    const res = await api.patch<{ success: boolean; data: MaintenanceLog }>(
      `/maintenance-logs/${logId}`,
      data
    )
    return res.data.data
  },
}
