import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import {
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/authStore'

// ── Format helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const METHOD_LABEL: Record<string, { label: string; tone: string }> = {
  realtime: { label: 'Thiết bị', tone: 'info' },
  manual: { label: 'Nhân viên', tone: 'warning' },
  qr: { label: 'QR', tone: 'muted' },
}

// ── Attendance tooltip ─────────────────────────────────────────────────────────

function AttendanceTooltip({
  log,
  align = 'left',
}: {
  log: AttendanceLog
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
            {fmtTime(log.startTime)}
            {log.endTime ? ` → ${fmtTime(log.endTime)}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

const AttendanceCalendarItem = memo(function AttendanceCalendarItem({
  log,
  align,
}: {
  log: AttendanceLog
  align: 'left' | 'right'
}) {
  return (
    <div className="rogym-session-hover relative">
      <div
        className="rogym-calendar-session cursor-default truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
        data-status="completed"
      >
        {fmtTime(log.startTime)}
      </div>
      <AttendanceTooltip log={log} align={align} />
    </div>
  )
})

// ── Calendar view ──────────────────────────────────────────────────────────────

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function AttendanceCalendarView({
  logs,
  month,
  onPrevMonth,
  onNextMonth,
}: {
  logs: AttendanceLog[]
  month: Date
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceLog[]>()
    for (const log of logs) {
      const k = dateKey(log.startTime)
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
    <div className="rounded-[20px] p-5 rogym-sx-25952519">
      {/* Month navigation */}
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

      {/* DOW header */}
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

      {/* Weeks */}
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
                            key={log.attendanceId}
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
    </div>
  )
}

// ── Attendance list sidebar ────────────────────────────────────────────────────

function AttendanceListSidebar({
  logs,
  from,
  to,
  onFromChange,
  onToChange,
  loading,
  error,
}: {
  logs: AttendanceLog[]
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[20px] p-5 rogym-sx-25952519">
        {/* Date range pickers */}
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="flex-1 min-w-0">
            <DatePickerInput
              value={from}
              onChange={onFromChange}
              placeholder="Từ ngày"
              aria-label="Từ ngày"
            />
          </div>
          <p className="shrink-0 text-xs rogym-sx-5e5c39ab px-1">tới</p>
          <div className="flex-1 min-w-0">
            <DatePickerInput
              value={to}
              onChange={onToChange}
              placeholder="Đến ngày"
              aria-label="Đến ngày"
            />
          </div>
        </div>

        <h2 className="mb-3 text-sm font-bold text-white">Lịch sử điểm danh</h2>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-center text-sm rogym-sx-5e5c39ab">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CalendarX size={28} className="rogym-sx-ed519d00" />
            <p className="text-sm rogym-sx-5e5c39ab">Không có lần điểm danh nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const method = METHOD_LABEL[log.method] ?? { label: log.method, tone: 'muted' }
              return (
                <div
                  key={log.attendanceId}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="rogym-sx-f27dac31 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {fmtDateShort(log.startTime)}
                      </p>
                      <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                        {fmtTime(log.startTime)}
                        {log.endTime ? ` → ${fmtTime(log.endTime)}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="rogym-tone-badge" data-tone={method.tone}>
                    {method.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const memberId = useAuthStore((s) => s.user?.memberId) ?? ''

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [calLogs, setCalLogs] = useState<AttendanceLog[]>([])
  const [calLoading, setCalLoading] = useState(true)
  const [calError, setCalError] = useState<string | null>(null)

  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return toISODate(d)
  })
  const [to, setTo] = useState(() => toISODate(new Date()))
  const [listLogs, setListLogs] = useState<AttendanceLog[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const loadCalLogs = useCallback(() => {
    if (!memberId) {
      setCalLoading(false)
      return
    }
    setCalLoading(true)
    setCalError(null)
    const fromISO = toISODate(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1))
    const toISO = toISODate(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0))
    trainingService
      .getAttendance({ memberId, from: fromISO, to: toISO, pageSize: 100 })
      .then((res) => setCalLogs(res.data))
      .catch((err) => setCalError(getApiError(err, 'Không thể tải lịch điểm danh.')))
      .finally(() => setCalLoading(false))
  }, [memberId, calMonth])

  useEffect(() => {
    loadCalLogs()
  }, [loadCalLogs])

  const loadListLogs = useCallback(() => {
    if (!memberId) {
      setListLoading(false)
      return
    }
    setListLoading(true)
    setListError(null)
    trainingService
      .getAttendance({ memberId, from, to, pageSize: 100 })
      .then((res) => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
        setListLogs(sorted)
      })
      .catch((err) => setListError(getApiError(err, 'Không thể tải lịch sử điểm danh.')))
      .finally(() => setListLoading(false))
  }, [memberId, from, to])

  useEffect(() => {
    loadListLogs()
  }, [loadListLogs])

  function prevMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Điểm danh"
        title="Lịch sử điểm danh"
        description="Theo dõi các lần check-in của bạn tại phòng tập."
      />
      <div className="grid gap-5 lg:grid-cols-[65fr_35fr]">
        {calLoading ? (
          <MemberSkeleton rows={5} />
        ) : calError ? (
          <MemberErrorState message={calError} onRetry={loadCalLogs} />
        ) : (
          <AttendanceCalendarView
            logs={calLogs}
            month={calMonth}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
        )}
        <AttendanceListSidebar
          logs={listLogs}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          loading={listLoading}
          error={listError}
        />
      </div>
    </MemberPage>
  )
}
