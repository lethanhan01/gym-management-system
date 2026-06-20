import api from './api'

export interface StaffAttendanceLog {
  logId: string
  staffId: string
  checkIn: string
  checkOut: string | null
  durationMinutes: number | null
}

const staffAttendanceService = {
  async checkIn(): Promise<StaffAttendanceLog> {
    const res = await api.post<{ success: boolean; data: StaffAttendanceLog }>(
      '/staff/me/attendance/check-in'
    )
    return res.data.data
  },

  async checkOut(): Promise<StaffAttendanceLog> {
    const res = await api.post<{ success: boolean; data: StaffAttendanceLog }>(
      '/staff/me/attendance/check-out'
    )
    return res.data.data
  },

  async getMyAttendance(params: {
    from: string
    to: string
    pageSize?: number
  }): Promise<{ data: StaffAttendanceLog[]; total: number }> {
    const res = await api.get<{ success: boolean; data: { data: StaffAttendanceLog[]; total: number } }>(
      '/staff/me/attendance',
      { params }
    )
    return res.data.data
  },
}

export default staffAttendanceService
