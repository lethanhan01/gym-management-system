import api from './api'

export type StaffPosition = 'owner' | 'staff' | 'trainer' | 'member'

export interface StaffProfile {
  staffId: string
  userId: string
  staffCode: string
  position: StaffPosition
  fullName: string
  email: string
  phone: string | null
  status: string
}

export interface StaffSchedule {
  scheduleId: string
  staffId: string
  shift: 'morning' | 'afternoon' | 'evening'
  workDate: string
}

export interface ScheduleWithStaff {
  scheduleId: string
  staffId: string
  staffCode: string
  fullName: string
  shift: 'morning' | 'afternoon' | 'evening'
  workDate: string // YYYY-MM-DD
}

export interface StaffListItem {
  staffId: string
  userId: string
  staffCode: string
  position: string
  fullName: string
  email: string
  phone: string | null
  status?: string
}

export interface ListStaffParams {
  page?: number
  pageSize?: number
  position?: StaffPosition
  status?: string
  search?: string
  sort?: string
}

export interface CreateStaffDto {
  email: string
  fullName: string
  phone?: string
  position: StaffPosition
  groupIds?: string[]
}

export interface UpdateStaffDto {
  fullName?: string
  phone?: string | null
  position?: StaffPosition
}

export const staffService = {
  getMe: async (): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>('/staff/me')
    return res.data.data
  },

  list: async (params: ListStaffParams = {}): Promise<{ data: StaffProfile[]; total: number }> => {
    // Backend returns: { success, data: { data: [...], meta: { totalItems } } }
    const res = await api.get<{
      success: boolean
      data: { data: StaffProfile[]; meta: { totalItems: number } }
    }>('/staff', { params })
    return {
      data: res.data.data.data,
      total: res.data.data.meta.totalItems,
    }
  },

  get: async (staffId: string): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>(`/staff/${staffId}`)
    return res.data.data
  },

  create: async (dto: CreateStaffDto): Promise<StaffProfile> => {
    const res = await api.post<{ success: boolean; data: StaffProfile }>('/staff', dto)
    return res.data.data
  },

  update: async (staffId: string, dto: UpdateStaffDto): Promise<StaffProfile> => {
    const res = await api.patch<{ success: boolean; data: StaffProfile }>(`/staff/${staffId}`, dto)
    return res.data.data
  },

  delete: async (staffId: string): Promise<void> => {
    await api.delete(`/staff/${staffId}`)
  },
  getSchedules: async (staffId: string): Promise<StaffSchedule[]> => {
    const res = await api.get<{ success: boolean; data: StaffSchedule[] }>(
      `/staff/${staffId}/schedules`
    )
    return res.data.data
  },

  createSchedules: async (
    staffId: string,
    schedules: { shift: string; workDate: string }[]
  ): Promise<{ created: number }> => {
    const res = await api.post<{ success: boolean; data: { created: number } }>(
      `/staff/${staffId}/schedules`,
      { schedules }
    )
    return res.data.data
  },

  deleteSchedule: async (staffId: string, scheduleId: string): Promise<void> => {
    await api.delete(`/staff/${staffId}/schedules/${scheduleId}`)
  },

  getAllSchedules: async (from: string, to: string): Promise<ScheduleWithStaff[]> => {
    const res = await api.get<{ success: boolean; data: ScheduleWithStaff[] }>(
      '/staff/schedules/range',
      { params: { from, to } }
    )
    return res.data.data
  },
}
