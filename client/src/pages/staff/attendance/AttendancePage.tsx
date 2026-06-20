import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight, Clock, LogIn, LogOut, Timer } from 'lucide-react'
import staffAttendanceService, { type StaffAttendanceLog } from '@/services/staffAttendance.service'
import { useStaffAttendanceStore } from '@/stores/staffAttendanceStore'
import {
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffErrorState,
} from '@/components/StaffUI'
import { getApiError } from '@/lib/api-error'

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Calendar tooltip ────────────────────────────────────────────────────────────

function AttendanceTooltip({
  log,
  align = 'left',
}: {
  log: StaffAttendanceLog
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={`rogym-session-tooltip pointer-events-none absolute top-full z-30 mt-1 min-w-[140px] rounded-xl p-3 shadow-2xl ${
        align === 'right' ? 'is-right' : ''
      }`}
    >
      <div className="text-xs rogym-sx-d88f932f">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="rogym-sx-f27dac31" />
          <span className="text-white">
            {fmtTime(log.checkIn)}
            {log.checkOut ? ` → ${fmtTime(log.checkOut)}` : ''}
          </span>
        </div>
        {log.durationMinutes !== null && (
          <div className="mt-1 text-[10px] rogym-sx-5e5c39ab">
            {fmtDuration(log.durationMinutes)}
          </div>
        )}
      </div>
    </div>
  )
}

const AttendanceCalendarItem = memo(function AttendanceCalendarItem({
  log,
  align,
}: {
  log: StaffAttendanceLog
  align: 'left' | 'right'
}) {
  return (
    <div className="rogym-session-hover relative">
      <div
        className="rogym-calendar-session cursor-default truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
        data-status="completed"
      >
        {fmtTime(log.checkIn)}
      </div>
      <AttendanceTooltip log={log} align={align} />
    </div>
  )
})

// ── Calendar view ────────────────────────────────────────────────────────────────

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function AttendanceCalendarView({
  logs,
  month,
  onPrevMonth,
  onNextMonth,
  loading,
  error,
  onRetry,
}: {
  logs: StaffAttendanceLog[]
  month: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, StaffAttendanceLog[]>()
    for (const log of logs) {
      const k = dateKey(log.checkIn)
      const arr = map.get(k) ?? []
      arr.push(log)
      map.set(k, arr)
    }
    return map
  }, [logs])

  const grid = useMemo(() => {
    const year = month.getFullYear()
    const mon = month.getMonth()
    const firstDay = new Date(year, mon, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, mon + 1, 0).getDate()
    const cells: Array<{ date: Date | null; key: string | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, mon, d)
      const key = `${year}-${mon}-${d}`
      cells.push({ date, key })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: null })
    const rows: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [month])

  const today = todayKey()

  return (
    <div className="rogym-card rogym-card--compact p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 rogym-sx-5e5c39ab"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-white capitalize">{fmtMonthYear(month)}</p>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 rogym-sx-5e5c39ab"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-bold uppercase tracking-wider rogym-sx-ed519d00"
          >
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <StaffSkeleton rows={5} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={onRetry} />
      ) : (
        <div className="space-y-0.5">
          {grid.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7">
              {row.map((cell, ci) => {
                const isToday = cell.key === today
                const cellLogs = cell.key ? (byDate.get(cell.key) ?? []) : []
                return (
                  <div
                    key={ci}
                    className={`rogym-calendar-cell relative min-h-[68px] p-1 ${
                      isToday ? 'is-today' : ''
                    }`}
                  >
                    {cell.date && (
                      <>
                        <span
                          className={`rogym-calendar-date flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isToday ? 'is-today' : ''
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {cellLogs.map((log) => (
                            <AttendanceCalendarItem
                              key={log.logId}
                              log={log}
                              align={ci >= 4 ? 'right' : 'left'}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6">
          <CalendarX size={28} className="rogym-sx-ed519d00" />
          <p className="text-sm rogym-sx-5e5c39ab">Chưa có lần chấm công nào trong tháng</p>
        </div>
      )}
    </div>
  )
}

// ── Check-in card ────────────────────────────────────────────────────────────────

function CheckInCard({
  openLog,
  loading,
  error,
  onCheckIn,
  onCheckOut,
}: {
  openLog: StaffAttendanceLog | null
  loading: boolean
  error: string | null
  onCheckIn: () => void
  onCheckOut: () => void
}) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!openLog) {
      setElapsed('')
      return
    }
    function update() {
      if (!openLog) return
      const diff = Math.floor((Date.now() - new Date(openLog.checkIn).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [openLog])

  return (
    <section className="rogym-card rogym-card--compact p-6 space-y-5">
      <h2 className="text-base font-bold text-white">Chấm công</h2>

      {openLog ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 rogym-text-accent">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold">Đang làm việc</span>
            </div>
            <div className="flex items-center gap-2 rogym-text-dim text-sm">
              <LogIn size={14} />
              <span>Vào lúc {fmtTime(openLog.checkIn)}</span>
            </div>
            {elapsed && (
              <div className="flex items-center gap-2 text-sm text-white">
                <Timer size={14} className="rogym-sx-f27dac31" />
                <span className="font-mono font-semibold">{elapsed}</span>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="button"
            onClick={onCheckOut}
            disabled={loading}
            className="rogym-btn rogym-btn--danger w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LogOut size={16} />
            )}
            Chấm ra
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="flex items-center gap-2 rogym-text-dim">
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <span className="text-sm">Chưa chấm công hôm nay</span>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="button"
            onClick={onCheckIn}
            disabled={loading}
            className="rogym-btn rogym-btn--primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LogIn size={16} />
            )}
            Chấm vào
          </button>
        </div>
      )}
    </section>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────────

export default function StaffAttendancePage() {
  // Trạng thái chấm vào/ra + timer dùng chung với Dashboard.
  const openLog = useStaffAttendanceStore((s) => s.openLog)
  const actionLoading = useStaffAttendanceStore((s) => s.actionLoading)
  const actionError = useStaffAttendanceStore((s) => s.actionError)
  const loadAttendance = useStaffAttendanceStore((s) => s.load)
  const storeCheckIn = useStaffAttendanceStore((s) => s.checkIn)
  const storeCheckOut = useStaffAttendanceStore((s) => s.checkOut)

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [calLogs, setCalLogs] = useState<StaffAttendanceLog[]>([])
  const [calLoading, setCalLoading] = useState(true)
  const [calError, setCalError] = useState<string | null>(null)

  const loadCalLogs = useCallback(() => {
    setCalLoading(true)
    setCalError(null)
    const from = toISODate(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1))
    const to = toISODate(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0))
    staffAttendanceService
      .getMyAttendance({ from, to, pageSize: 100 })
      .then((res) => setCalLogs(res.data))
      .catch((err) => setCalError(getApiError(err, 'Không thể tải lịch chấm công.')))
      .finally(() => setCalLoading(false))
  }, [calMonth])

  useEffect(() => {
    loadCalLogs()
  }, [loadCalLogs])

  useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  async function handleCheckIn() {
    const log = await storeCheckIn()
    if (log) setCalLogs((prev) => [log, ...prev])
  }

  async function handleCheckOut() {
    const updated = await storeCheckOut()
    if (updated) {
      setCalLogs((prev) => prev.map((l) => (l.logId === updated.logId ? updated : l)))
    } else {
      // Có thể ngày công đã bị hủy do chấm ra khác ngày → đồng bộ lại lịch.
      loadCalLogs()
    }
  }

  function prevMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Chấm công"
        description="Ghi nhận giờ vào / ra để tính công và kiểm tra KPI."
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <CheckInCard
          openLog={openLog}
          loading={actionLoading}
          error={actionError}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />

        <AttendanceCalendarView
          logs={calLogs}
          month={calMonth}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          loading={calLoading}
          error={calError}
          onRetry={loadCalLogs}
        />
      </div>
    </StaffPage>
  )
}
