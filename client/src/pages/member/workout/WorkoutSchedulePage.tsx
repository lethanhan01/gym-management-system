import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  MapPin,
  User,
  X,
} from 'lucide-react'
import {
  trainingService,
  type TrainingSession,
  type TrainingSessionDetail,
} from '@/services/training.service'
import {
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import { getApiError } from '@/lib/api-error'

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function fmtDatetime(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDateShort(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMonthYear(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function getDowLabels(locale: string): string[] {
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

function daysUntil(iso: string, t: TFunction<'member'>) {
  const s = new Date(iso)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  s.setHours(0, 0, 0, 0)
  const diff = Math.ceil((s.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return t('workout.schedule.today')
  if (diff === 1) return t('workout.schedule.tomorrow')
  if (diff < 0) return t('workout.schedule.passed')
  return t('workout.schedule.daysLeft', { count: diff })
}

// ── Session tooltip bubble ─────────────────────────────────────────────────────

function SessionTooltip({
  session,
  locale,
  align = 'left',
}: {
  session: TrainingSession
  locale: string
  align?: 'left' | 'right'
}) {
  const { t } = useTranslation('member')
  return (
    <div
      className={`rogym-session-tooltip pointer-events-none absolute top-full z-30 mt-1 min-w-[200px] rounded-xl p-3 shadow-2xl ${
        align === 'right' ? 'is-right' : ''
      }`}
    >
      <div className="space-y-1.5 text-xs rogym-sx-d88f932f">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="rogym-sx-f27dac31" />
          <span>{fmtDatetime(session.startTime, locale)}</span>
        </div>
        {session.trainerName && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="rogym-sx-f27dac31" />
            <span>{t('workout.schedule.trainerPrefix')} {session.trainerName}</span>
          </div>
        )}
        {session.roomName && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="rogym-sx-f27dac31" />
            <span>{session.roomName}</span>
          </div>
        )}
        <div
          className="rogym-session-status mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
          data-status={session.status}
        >
          {t(`workout.schedule.statusLabel.${session.status}`, { defaultValue: session.status })}
        </div>
      </div>
    </div>
  )
}

const CalendarSession = memo(function CalendarSession({
  session,
  locale,
  align,
  onSelect,
}: {
  session: TrainingSession
  locale: string
  align: 'left' | 'right'
  onSelect: (session: TrainingSession) => void
}) {
  return (
    <button
      type="button"
      className="rogym-session-hover relative block w-full text-left"
      onClick={() => onSelect(session)}
      data-no-sweep
    >
      <div
        className="rogym-calendar-session truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
        data-status={session.status}
      >
        {fmtTime(session.startTime, locale)}
        {session.trainerName ? ` · ${session.trainerName.split(' ').pop()}` : ''}
      </div>
      <SessionTooltip session={session} locale={locale} align={align} />
    </button>
  )
})

// ── Calendar view ──────────────────────────────────────────────────────────────

function CalendarView({
  sessions,
  onSelect,
}: {
  sessions: TrainingSession[]
  onSelect: (session: TrainingSession) => void
}) {
  const { t, i18n } = useTranslation('member')
  const locale = i18n.language
  const dowLabels = useMemo(() => getDowLabels(locale), [locale])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  // Index sessions by date key
  const byDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    for (const s of sessions) {
      const k = dateKey(s.startTime)
      const arr = map.get(k) ?? []
      arr.push(s)
      map.set(k, arr)
    }
    return map
  }, [sessions])

  // Build calendar grid (6 rows × 7 cols, Mon-first)
  const grid = useMemo(() => {
    const year = month.getFullYear()
    const mon = month.getMonth()
    const firstDay = new Date(year, mon, 1)
    // Mon=0 … Sun=6
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

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <div className="rounded-[20px] p-5 rogym-sx-25952519">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs rogym-sx-5e5c39ab">
        {[
          { status: 'scheduled', label: t('workout.schedule.legendScheduled') },
          { status: 'completed', label: t('workout.schedule.legendCompleted') },
        ].map(({ status, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="rogym-session-legend inline-block h-2.5 w-2.5 rounded-full"
              data-status={status}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 rogym-sx-5e5c39ab"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-white capitalize">{fmtMonthYear(month, locale)}</p>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 rogym-sx-5e5c39ab"
        >
          <ChevronRight size={16} />
        </button>
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
              const cellSessions = cell.key ? (byDate.get(cell.key) ?? []) : []
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
                        {cellSessions.map((s) => (
                          <CalendarSession
                            key={s.sessionId}
                            session={s}
                            locale={locale}
                            align={ci >= 4 ? 'right' : 'left'}
                            onSelect={onSelect}
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

// ── Session sidebar ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('member')
  return (
    <span className="rogym-session-status is-pill" data-status={status}>
      {t(`workout.schedule.statusLabel.${status}`, { defaultValue: status })}
    </span>
  )
}

function UpcomingRow({
  session,
  onSelect,
}: {
  session: TrainingSession
  onSelect: (session: TrainingSession) => void
}) {
  const { t, i18n } = useTranslation('member')
  return (
    <button
      type="button"
      className="rogym-session-hover relative block w-full text-left"
      onClick={() => onSelect(session)}
      data-no-sweep
    >
      <div className="rogym-upcoming-session flex items-center justify-between gap-4 rounded-xl p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg rogym-sx-e15f57de">
            <Calendar size={16} className="rogym-sx-b2fbf853" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{fmtDateShort(session.startTime, i18n.language)}</p>
            {session.trainerName && (
              <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
                {t('workout.schedule.trainerPrefix')}: {session.trainerName}
                {session.roomName ? ` · ${session.roomName}` : ''}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <SessionTooltip session={session} locale={i18n.language} />
    </button>
  )
}

function PastRow({
  session,
  onSelect,
}: {
  session: TrainingSession
  onSelect: (session: TrainingSession) => void
}) {
  const { t, i18n } = useTranslation('member')
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 rounded-xl p-4 text-left rogym-sx-a15e2a7c"
      onClick={() => onSelect(session)}
      data-no-sweep
    >
      <div>
        <p className="text-sm font-semibold text-white">{fmtDateShort(session.startTime, i18n.language)}</p>
        {session.trainerName && (
          <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
            {t('workout.schedule.trainerPrefix')}: {session.trainerName}
            {session.roomName ? ` · ${session.roomName}` : ''}
          </p>
        )}
      </div>
      <StatusBadge status={session.status} />
    </button>
  )
}

function SessionSidebar({
  upcoming,
  past,
  onSelect,
}: {
  upcoming: TrainingSession[]
  past: TrainingSession[]
  onSelect: (session: TrainingSession) => void
}) {
  const { t, i18n } = useTranslation('member')
  const nextSession = upcoming[0]
  const countdown = nextSession ? daysUntil(nextSession.startTime, t) : null
  const isToday = nextSession ? (() => {
    const s = new Date(nextSession.startTime)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    s.setHours(0, 0, 0, 0)
    return s.getTime() === now.getTime()
  })() : false
  const upcomingRest = upcoming.slice(1)

  return (
    <div className="space-y-5">
      {/* Next session hero */}
      {nextSession ? (
        <button
          type="button"
          className="rogym-card rogym-card--md block w-full p-5 text-left rogym-sx-f1ead95f"
          onClick={() => onSelect(nextSession)}
          data-no-sweep
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest rogym-sx-b2fbf853">
            {t('workout.schedule.nextSession')}
          </p>
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-[14px] rogym-sx-c3b5e656">
              <User size={24} className="rogym-sx-b2fbf853" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white">{fmtDatetime(nextSession.startTime, i18n.language)}</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs rogym-sx-d88f932f">
                {nextSession.trainerName && (
                  <span className="flex items-center gap-1">
                    <User size={11} className="rogym-sx-f27dac31" />
                    {t('workout.schedule.trainerPrefix')} {nextSession.trainerName}
                  </span>
                )}
                {nextSession.roomName && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="rogym-sx-f27dac31" />
                    {nextSession.roomName}
                  </span>
                )}
              </div>
              <p
                className={`mt-2 text-lg font-bold ${
                  isToday ? 'rogym-text-green' : 'rogym-text-accent'
                }`}
              >
                {countdown}
              </p>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] p-6 text-center rogym-sx-180e132e">
          <CalendarX size={32} className="rogym-sx-ed519d00" />
          <p className="text-sm font-medium text-white">{t('workout.schedule.noUpcoming')}</p>
          <p className="text-xs rogym-sx-5e5c39ab">{t('workout.schedule.noUpcomingHint')}</p>
        </div>
      )}

      {/* Upcoming rest */}
      {upcomingRest.length > 0 && (
        <section className="rounded-[20px] p-5 rogym-sx-25952519">
          <h2 className="mb-3 text-sm font-bold text-white">{t('workout.schedule.sectionUpcoming')}</h2>
          <div className="space-y-2">
            {upcomingRest.map((s) => (
              <UpcomingRow key={s.sessionId} session={s} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      <section className="rounded-[20px] p-5 rogym-sx-25952519">
        <h2 className="mb-3 text-sm font-bold text-white">{t('workout.schedule.sectionCompleted')}</h2>
        {past.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CalendarX size={28} className="rogym-sx-ed519d00" />
            <p className="text-sm rogym-sx-5e5c39ab">{t('workout.schedule.noCompleted')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {past.map((s) => (
              <PastRow key={s.sessionId} session={s} onSelect={onSelect} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SessionDetailModal({
  session,
  loading,
  error,
  onClose,
}: {
  session: TrainingSessionDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('member')
  const exercises = session?.planDay?.exercises ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rogym-sx-8578aed4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[24px] rogym-sx-1f8ae2ef">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest rogym-sx-b2fbf853">
              {t('workout.schedule.modalTitle')}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {session?.planDay?.name ?? t('workout.session.defaultDayName')}
            </h2>
          </div>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label={t('workout.schedule.buttonClose')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {loading ? (
            <MemberSkeleton rows={4} />
          ) : error ? (
            <MemberErrorState message={error} />
          ) : session ? (
            <>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl p-4 rogym-sx-a15e2a7c">
                  <p className="text-xs font-semibold uppercase rogym-sx-ed519d00">{t('workout.schedule.fieldTime')}</p>
                  <p className="mt-1 font-semibold text-white">{fmtDatetime(session.startTime, i18n.language)}</p>
                </div>
                <div className="rounded-xl p-4 rogym-sx-a15e2a7c">
                  <p className="text-xs font-semibold uppercase rogym-sx-ed519d00">{t('workout.schedule.fieldStatus')}</p>
                  <div className="mt-2">
                    <StatusBadge status={session.status} />
                  </div>
                </div>
                <div className="rounded-xl p-4 rogym-sx-a15e2a7c">
                  <p className="text-xs font-semibold uppercase rogym-sx-ed519d00">{t('workout.schedule.fieldTrainer')}</p>
                  <p className="mt-1 font-semibold text-white">{session.trainerName ?? '—'}</p>
                </div>
                <div className="rounded-xl p-4 rogym-sx-a15e2a7c">
                  <p className="text-xs font-semibold uppercase rogym-sx-ed519d00">{t('workout.schedule.fieldRoom')}</p>
                  <p className="mt-1 font-semibold text-white">{session.roomName ?? '—'}</p>
                </div>
              </div>

              {session.workoutPlan && session.planDay ? (
                <section className="rounded-xl p-4 rogym-sx-25952519">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl rogym-sx-e15f57de">
                      <Dumbbell size={18} className="rogym-sx-b2fbf853" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{session.workoutPlan.name}</p>
                      <p className="mt-1 text-xs rogym-sx-5e5c39ab">
                        {t('workout.schedule.dayWeek', { day: session.planDay.dayNumber, week: session.planDay.weekNumber })} ·{' '}
                        {exercises.length} {t('workout.myPlan.unitExercises')}
                      </p>
                      {session.planDay.notes && (
                        <p className="mt-2 text-xs rogym-sx-d88f932f">{session.planDay.notes}</p>
                      )}
                    </div>
                  </div>
                </section>
              ) : (
                <p className="rounded-xl p-4 text-sm rogym-sx-a15e2a7c">
                  {t('workout.schedule.noWorkoutPlan')}
                </p>
              )}

              {exercises.length > 0 && (
                <section className="space-y-2">
                  {exercises
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((item, index) => {
                      const isCardio = item.exercise?.category === 'cardio'
                      return (
                        <div
                          key={item.planExerciseId}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.exercise?.name ?? t('workout.session.defaultExerciseName')}
                            </p>
                            <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
                              {item.targetSets} sets ·{' '}
                              {isCardio
                                ? `${item.targetDurationSec ?? 0} ${t('workout.schedule.unitSeconds')}`
                                : `${item.targetReps ?? 0} reps`}
                              {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)} kg` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </section>
              )}

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs rogym-sx-5e5c39ab">
                  {t('workout.schedule.trainerManages')}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WorkoutSchedulePage() {
  const { t } = useTranslation('member')
  const [upcoming, setUpcoming] = useState<TrainingSession[]>([])
  const [past, setPast] = useState<TrainingSession[]>([])
  const [all, setAll] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionDetail, setSessionDetail] = useState<TrainingSessionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadSessions = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      trainingService.getSessions({ status: 'scheduled', pageSize: 50, sort: 'start_time:asc' }),
      trainingService.getSessions({ status: 'in_progress', pageSize: 20, sort: 'start_time:asc' }),
      trainingService.getSessions({ status: 'completed', pageSize: 30, sort: 'start_time:desc' }),
    ])
      .then(([scheduledRes, inProgressRes, doneRes]) => {
        const activeSessions = [...inProgressRes.data, ...scheduledRes.data].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        setUpcoming(activeSessions)
        setPast(doneRes.data)
        setAll([...activeSessions, ...doneRes.data])
      })
      .catch((err) => setError(getApiError(err, t('workout.schedule.errorLoad'))))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }

    let active = true
    setDetailLoading(true)
    setDetailError(null)
    trainingService
      .getSession(selectedSessionId)
      .then((session) => {
        if (active) setSessionDetail(session)
      })
      .catch((err) => {
        if (active) setDetailError(getApiError(err, t('workout.schedule.errorLoad')))
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedSessionId])

  const handleSelectSession = useCallback((session: TrainingSession) => {
    setSelectedSessionId(session.sessionId)
  }, [])

  if (loading)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow={t('workout.schedule.eyebrow')} title={t('workout.schedule.pageTitle')} />
        <MemberSkeleton rows={5} />
      </MemberPage>
    )

  if (error)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow={t('workout.schedule.eyebrow')} title={t('workout.schedule.pageTitle')} />
        <MemberErrorState message={error} onRetry={loadSessions} />
      </MemberPage>
    )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.schedule.eyebrow')}
        title={t('workout.schedule.pageTitle')}
        description={t('workout.schedule.description')}
      />
      <div className="grid gap-5 lg:grid-cols-[65fr_35fr]">
        <CalendarView sessions={all} onSelect={handleSelectSession} />
        <SessionSidebar upcoming={upcoming} past={past} onSelect={handleSelectSession} />
      </div>
      {selectedSessionId && (
        <SessionDetailModal
          session={sessionDetail}
          loading={detailLoading}
          error={detailError}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </MemberPage>
  )
}
