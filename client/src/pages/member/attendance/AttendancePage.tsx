import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import {
  MemberBadge,
  MemberCard,
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import { Button, DatePickerInput, type BadgeTone } from '@/components/ui'
import { getApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/authStore'

// ── Format helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMonthYear(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function getDowLabels(locale: string): string[] {
  // Generate Mon-Sun abbreviated day names using Intl, starting from Monday
  const base = new Date(2024, 0, 1) // Monday 1 Jan 2024
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d.toLocaleDateString(locale, { weekday: 'short' })
  })
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Attendance tooltip ─────────────────────────────────────────────────────────

function AttendanceTooltip({
  log,
  locale,
  align = 'left',
}: {
  log: AttendanceLog
  locale: string
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
            {fmtTime(log.startTime, locale)}
            {log.endTime ? ` → ${fmtTime(log.endTime, locale)}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

const AttendanceCalendarItem = memo(function AttendanceCalendarItem({
  log,
  locale,
  align,
}: {
  log: AttendanceLog
  locale: string
  align: 'left' | 'right'
}) {
  return (
    <div className="rogym-session-hover relative">
      <div
        className="rogym-calendar-session cursor-default truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
        data-status="completed"
      >
        {fmtTime(log.startTime, locale)}
      </div>
      <AttendanceTooltip log={log} locale={locale} align={align} />
    </div>
  )
})

// ── Calendar view ──────────────────────────────────────────────────────────────

function AttendanceCalendarView({
  logs,
  month,
  locale,
  onPrevMonth,
  onNextMonth,
}: {
  logs: AttendanceLog[]
  month: Date
  locale: string
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const dowLabels = useMemo(() => getDowLabels(locale), [locale])
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
    <MemberCard variant="compact" className="p-5">
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="icon"
          size="sm"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </Button>
        <p className="text-sm font-bold text-white capitalize">{fmtMonthYear(month, locale)}</p>
        <Button
          variant="icon"
          size="sm"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* DOW header */}
      <div className="mb-1 grid grid-cols-7">
        {dowLabels.map((d) => (
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
                            locale={locale}
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
    </MemberCard>
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
  const { t, i18n } = useTranslation('member')
  const locale = i18n.language
  const METHOD_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
    realtime: { label: t('attendance.methodLabel.realtime'), tone: 'info' },
    manual: { label: t('attendance.methodLabel.manual'), tone: 'warning' },
    qr: { label: t('attendance.methodLabel.qr'), tone: 'muted' },
  }
  return (
    <div className="space-y-5">
      <MemberCard variant="compact" className="p-5">
        {/* Date range pickers */}
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="flex-1 min-w-0">
            <DatePickerInput
              value={from}
              onChange={onFromChange}
              placeholder={t('attendance.fromDate')}
              aria-label={t('attendance.fromDate')}
            />
          </div>
          <p className="shrink-0 text-xs rogym-sx-5e5c39ab px-1">{t('attendance.dateSeparator')}</p>
          <div className="flex-1 min-w-0">
            <DatePickerInput
              value={to}
              onChange={onToChange}
              placeholder={t('attendance.toDate')}
              aria-label={t('attendance.toDate')}
            />
          </div>
        </div>

        <h2 className="mb-3 text-sm font-bold text-white">{t('attendance.sidebarTitle')}</h2>

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
          <MemberEmptyState
            title={t('attendance.noData')}
          />
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const method = METHOD_LABEL[log.method] ?? { label: log.method, tone: 'muted' as BadgeTone }
              return (
                <div
                  key={log.attendanceId}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="rogym-sx-f27dac31 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {fmtDateShort(log.startTime, locale)}
                      </p>
                      <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                        {fmtTime(log.startTime, locale)}
                        {log.endTime ? ` → ${fmtTime(log.endTime, locale)}` : ''}
                      </p>
                    </div>
                  </div>
                  <MemberBadge tone={method.tone}>
                    {method.label}
                  </MemberBadge>
                </div>
              )
            })}
          </div>
        )}
      </MemberCard>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { t, i18n } = useTranslation('member')
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
      .catch((err) => setCalError(getApiError(err, t('attendance.errorCalendar'))))
      .finally(() => setCalLoading(false))
  }, [memberId, calMonth, t])

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
      .catch((err) => setListError(getApiError(err, t('attendance.errorList'))))
      .finally(() => setListLoading(false))
  }, [memberId, from, t, to])

  useEffect(() => {
    loadListLogs()
  }, [loadListLogs])

  function prevMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  // Tính METHOD_LABEL cho inline mobile card list (dùng lại logic từ AttendanceListSidebar)
  const METHOD_LABEL_MOBILE: Record<string, { label: string; tone: BadgeTone }> = {
    realtime: { label: t('attendance.methodLabel.realtime'), tone: 'info' },
    manual: { label: t('attendance.methodLabel.manual'), tone: 'warning' },
    qr: { label: t('attendance.methodLabel.qr'), tone: 'muted' },
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('attendance.eyebrow')}
        title={t('attendance.title')}
        description={t('attendance.description')}
      />

      {/* Desktop: calendar + sidebar nằm ngang */}
      <div className="hidden lg:grid gap-5 lg:grid-cols-[65fr_35fr]">
        {calLoading ? (
          <MemberSkeleton rows={5} />
        ) : calError ? (
          <MemberErrorState message={calError} onRetry={loadCalLogs} />
        ) : (
          <AttendanceCalendarView
            logs={calLogs}
            month={calMonth}
            locale={i18n.language}
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

      {/* Mobile: calendar stack trên, card list stack dưới */}
      <div className="lg:hidden space-y-5">
        {calLoading ? (
          <MemberSkeleton rows={5} />
        ) : calError ? (
          <MemberErrorState message={calError} onRetry={loadCalLogs} />
        ) : (
          <AttendanceCalendarView
            logs={calLogs}
            month={calMonth}
            locale={i18n.language}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
        )}

        {/* Mobile: card list — cùng tháng với calendar, tự cập nhật khi navigate tháng */}
        {!calLoading && !calError && (
          <div className="space-y-2">
            {calLogs.length === 0 ? (
              <MemberEmptyState
                title={t('attendance.noData')}
              />
            ) : (
              [...calLogs]
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((log) => {
                  const method = METHOD_LABEL_MOBILE[log.method] ?? { label: log.method, tone: 'muted' as BadgeTone }
                  return (
                    <div
                      key={log.attendanceId}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="rogym-sx-f27dac31 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {fmtDateShort(log.startTime, i18n.language)}
                          </p>
                          <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                            {fmtTime(log.startTime, i18n.language)}
                            {log.endTime ? ` → ${fmtTime(log.endTime, i18n.language)}` : ''}
                          </p>
                        </div>
                      </div>
                      <MemberBadge tone={method.tone}>
                        {method.label}
                      </MemberBadge>
                    </div>
                  )
                })
            )}
          </div>
        )}
      </div>
    </MemberPage>
  )
}
