import { create } from 'zustand'
import staffAttendanceService, { type StaffAttendanceLog } from '@/services/staffAttendance.service'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { todayInput, startOfLocalDayIso, endOfLocalDayIso } from '@/lib/date'
import { toast } from '@/lib/toast'

interface StaffAttendanceState {
  openLog: StaffAttendanceLog | null
  todayLogs: StaffAttendanceLog[]
  loaded: boolean
  loadingToday: boolean
  actionLoading: boolean
  load: () => Promise<void>
  checkIn: () => Promise<StaffAttendanceLog | null>
  checkOut: () => Promise<StaffAttendanceLog | null>
}

export const useStaffAttendanceStore = create<StaffAttendanceState>((set, get) => ({
  openLog: null,
  todayLogs: [],
  loaded: false,
  loadingToday: false,
  actionLoading: false,

  load: async () => {
    const { loaded, loadingToday } = get()
    // Chỉ fetch một lần: skip nếu đã có data hoặc đang có request khác.
    // Các action checkIn/checkOut tự cập nhật store nên không cần reload sau action.
    if (loaded || loadingToday) return
    set({ loadingToday: true })
    try {
      const today = todayInput()
      const res = await staffAttendanceService.getMyAttendance({
        from: startOfLocalDayIso(today),
        to: endOfLocalDayIso(today),
        pageSize: 50,
      })
      set({
        todayLogs: res.data,
        openLog: res.data.find((l) => l.checkOut === null) ?? null,
        loaded: true,
        loadingToday: false,
      })
    } catch {
      // Lỗi mạng tạm thời: giữ state cũ, đánh dấu đã thử tải để không loop.
      set({ loaded: true, loadingToday: false })
    }
  },

  checkIn: async () => {
    if (get().actionLoading) return null
    set({ actionLoading: true })
    try {
      const log = await staffAttendanceService.checkIn()
      set((s) => ({ openLog: log, todayLogs: [log, ...s.todayLogs] }))
      toast.success('Chấm vào thành công.')
      return log
    } catch (err) {
      toast.error(getApiError(err, 'Chấm vào thất bại.'))
      return null
    } finally {
      set({ actionLoading: false })
    }
  },

  checkOut: async () => {
    if (get().actionLoading) return null
    set({ actionLoading: true })
    try {
      const updated = await staffAttendanceService.checkOut()
      set((s) => ({
        openLog: null,
        todayLogs: s.todayLogs.map((l) => (l.logId === updated.logId ? updated : l)),
      }))
      toast.success('Chấm ra thành công.')
      return updated
    } catch (err) {
      if (getApiErrorCode(err) === 'ATTENDANCE_VOIDED_DIFFERENT_DAY') {
        set((s) => ({
          openLog: null,
          todayLogs: s.todayLogs.filter((l) => l.checkOut !== null),
        }))
        toast.error(getApiError(err, 'Ca làm việc đã bị hủy vì chấm ra khác ngày.'))
      } else {
        toast.error(getApiError(err, 'Chấm ra thất bại.'))
      }
      return null
    } finally {
      set({ actionLoading: false })
    }
  },
}))
