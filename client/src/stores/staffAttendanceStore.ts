import { create } from 'zustand'
import staffAttendanceService, { type StaffAttendanceLog } from '@/services/staffAttendance.service'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { todayInput, startOfLocalDayIso, endOfLocalDayIso } from '@/lib/date'

interface StaffAttendanceState {
  openLog: StaffAttendanceLog | null
  todayLogs: StaffAttendanceLog[]
  loaded: boolean
  loadingToday: boolean
  actionLoading: boolean
  actionError: string | null
  /** Tải chấm công hôm nay — bỏ qua nếu đã tải hoặc đang fetch để tránh ghi đè state từ action. */
  load: () => Promise<void>
  checkIn: () => Promise<StaffAttendanceLog | null>
  checkOut: () => Promise<StaffAttendanceLog | null>
  clearError: () => void
}

export const useStaffAttendanceStore = create<StaffAttendanceState>((set, get) => ({
  openLog: null,
  todayLogs: [],
  loaded: false,
  loadingToday: false,
  actionLoading: false,
  actionError: null,

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
    set({ actionLoading: true, actionError: null })
    try {
      const log = await staffAttendanceService.checkIn()
      set((s) => ({ openLog: log, todayLogs: [log, ...s.todayLogs] }))
      return log
    } catch (err) {
      set({ actionError: getApiError(err, 'Chấm vào thất bại.') })
      return null
    } finally {
      set({ actionLoading: false })
    }
  },

  checkOut: async () => {
    if (get().actionLoading) return null
    set({ actionLoading: true, actionError: null })
    try {
      const updated = await staffAttendanceService.checkOut()
      set((s) => ({
        openLog: null,
        todayLogs: s.todayLogs.map((l) => (l.logId === updated.logId ? updated : l)),
      }))
      return updated
    } catch (err) {
      if (getApiErrorCode(err) === 'ATTENDANCE_VOIDED_DIFFERENT_DAY') {
        // Ngày công bị hủy do chấm ra khác ngày → bỏ phiên đang mở khỏi danh sách.
        set((s) => ({
          openLog: null,
          todayLogs: s.todayLogs.filter((l) => l.checkOut !== null),
          actionError: getApiError(err, 'Ca làm việc đã bị hủy vì chấm ra khác ngày.'),
        }))
      } else {
        set({ actionError: getApiError(err, 'Chấm ra thất bại.') })
      }
      return null
    } finally {
      set({ actionLoading: false })
    }
  },

  clearError: () => set({ actionError: null }),
}))
