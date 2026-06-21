import { Fragment, lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle, CheckCircle2, Clock3, Play, Plus, Users } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate, formatDateTime, formatTime, todayInput } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatCard,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

const LOCAL_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
})

const SessionDetailModal = lazy(() =>
  import('@/components/trainer/SessionDetailModal').then(({ SessionDetailModal }) => ({
    default: SessionDetailModal,
  }))
)

type SessionStatusUpdate = 'in_progress' | 'completed'

const TrainerDashboardActions = memo(function TrainerDashboardActions() {
  const { t } = useTranslation('trainer')
  return (
    <>
      <Link className="rogym-btn rogym-btn--outline-white" to="/trainer/sessions">
        <CalendarDays size={16} /> {t('dashboard.viewSchedule')}
      </Link>
      <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
        <Plus size={16} /> {t('dashboard.createSession')}
      </Link>
    </>
  )
})

const TodaySessionRow = memo(function TodaySessionRow({
  session,
  isLoading,
  onOpen,
  onUpdateStatus,
}: {
  session: TrainingSession
  isLoading: boolean
  onOpen: (sessionId: string) => void
  onUpdateStatus: (sessionId: string, status: SessionStatusUpdate) => void
}) {
  const { t } = useTranslation('trainer')
  const canStart = session.status === 'scheduled'
  const canComplete = session.status === 'scheduled' || session.status === 'in_progress'
  const isDone = session.status === 'completed' || session.status === 'cancelled'

  return (
    <div className="rogym-session-row is-today">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold rogym-text-primary">{session.memberName}</div>
          <TrainerStatusBadge status={session.status} />
        </div>
        <div className="mt-1 text-xs rogym-text-muted">
          {formatDateTime(session.startTime)}
          {session.roomName ? ` · ${session.roomName}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isDone && (
          <div className="flex gap-2">
            {canStart && (
              <button
                type="button"
                aria-label={t('sessions.startWith', { name: session.memberName })}
                disabled={isLoading}
                onClick={() => void onUpdateStatus(session.sessionId, 'in_progress')}
                className="rogym-inline-action rogym-inline-action--start"
                data-no-sweep
              >
                <Play size={12} />
                {t('dashboard.actions.start')}
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                aria-label={t('sessions.completeWith', { name: session.memberName })}
                disabled={isLoading}
                onClick={() => void onUpdateStatus(session.sessionId, 'completed')}
                className="rogym-inline-action rogym-inline-action--complete"
                data-no-sweep
              >
                <CheckCircle size={12} />
                {t('dashboard.actions.complete')}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className="rogym-text-link text-xs"
          aria-label={t('sessions.detailWith', { name: session.memberName })}
          onClick={() => onOpen(session.sessionId)}
        >
          {t('dashboard.actions.detail')}
        </button>
      </div>
    </div>
  )
})

const UpcomingSessionButton = memo(function UpcomingSessionButton({
  session,
  onOpen,
}: {
  session: TrainingSession
  onOpen: (sessionId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(session.sessionId)}
      className="rogym-upcoming-session flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
    >
      <span className="w-11 shrink-0 font-mono text-xs rogym-text-dim">
        {formatDayMonth(session.startTime)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold rogym-text-primary">{session.memberName}</div>
        <div className="text-xs rogym-text-muted">
          {formatTime(session.startTime)}
          {session.roomName ? ` · ${session.roomName}` : ''}
        </div>
      </div>
      <TrainerStatusBadge status={session.status} />
    </button>
  )
})

const ExpiringStudentLink = memo(function ExpiringStudentLink({
  student,
}: {
  student: TrainerStudentSummary
}) {
  const { t } = useTranslation('trainer')
  return (
    <Link
      to={`/trainer/students/${student.memberId}`}
      className="rogym-upcoming-session block rounded-xl p-4"
    >
      <div className="font-semibold rogym-text-primary">{student.fullName}</div>
      <div className="mt-1 text-xs rogym-tone-text" data-tone="warning">
        {t('dashboard.expiring.expiresOn', { date: formatDate(student.activeSubscription?.endDate) })}
      </div>
    </Link>
  )
})

export default function TrainerDashboardPage() {
  const { t } = useTranslation('trainer')
  const [students, setStudents] = useState<TrainerStudentSummary[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // sessionId being updated
  const [actionError, setActionError] = useState<string | null>(null)
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()
    Promise.all([
      memberService.list({ pageSize: 100 }),
      trainingService.getSessions({
        from: monthStart,
        to: nextWeek,
        pageSize: 100,
        sort: 'start_time:asc',
      }),
    ])
      .then(([studentResult, sessionResult]) => {
        setStudents(studentResult.data)
        setSessions(sessionResult.data)
      })
      .catch((err) => setError(getApiError(err, t('dashboard.error.loadFailed'))))
      .finally(() => setLoading(false))
  }, [reloadKey, t])

  const {
    todaySessions,
    completedThisMonth,
    upcoming,
    groupedUpcoming,
    expiringStudents,
    visibleExpiringStudents,
  } = useMemo(() => {
    const today = todayInput()
    const now = Date.now()
    const nextTodaySessions: TrainingSession[] = []
    const nextUpcoming: TrainingSession[] = []
    let nextCompletedThisMonth = 0

    for (const session of sessions) {
      if (formatLocalDay(session.startTime) === today) nextTodaySessions.push(session)
      if (session.status === 'completed') nextCompletedThisMonth += 1
      if (session.status === 'scheduled' && new Date(session.startTime).getTime() > now) {
        nextUpcoming.push(session)
      }
    }

    nextUpcoming.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const groupedUpcoming: { date: string; sessions: TrainingSession[] }[] = []
    {
      const seen = new Map<string, TrainingSession[]>()
      for (const s of nextUpcoming.slice(0, 10)) {
        const day = LOCAL_DAY_FORMATTER.format(new Date(s.startTime))
        if (!seen.has(day)) {
          const arr: TrainingSession[] = []
          seen.set(day, arr)
          groupedUpcoming.push({ date: day, sessions: arr })
        }
        seen.get(day)!.push(s)
      }
    }

    const nextExpiringStudents = students
      .filter((student) => {
        const endDate = student.activeSubscription?.endDate
        if (!endDate) return false
        const days = (new Date(endDate).getTime() - now) / 86400000
        return days >= 0 && days <= 14
      })
      .sort(
        (a, b) =>
          new Date(a.activeSubscription!.endDate).getTime() -
          new Date(b.activeSubscription!.endDate).getTime()
      )

    return {
      todaySessions: nextTodaySessions,
      completedThisMonth: nextCompletedThisMonth,
      upcoming: nextUpcoming,
      groupedUpcoming,
      expiringStudents: nextExpiringStudents,
      visibleExpiringStudents: nextExpiringStudents.slice(0, 6),
    }
  }, [sessions, students])

  const handleOpenSession = useCallback((sessionId: string) => setOpenedSessionId(sessionId), [])
  const handleCloseSession = useCallback(() => setOpenedSessionId(null), [])
  const handleSessionUpdated = useCallback(() => setReloadKey((k) => k + 1), [])

  const handleUpdateStatus = useCallback(async (sessionId: string, status: SessionStatusUpdate) => {
    setActionLoading(sessionId)
    setActionError(null)
    try {
      const updated = await trainingService.updateSessionStatus(sessionId, status)
      setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? updated : s)))
    } catch (err) {
      setActionError(getApiError(err, t('dashboard.error.updateStatus')))
    } finally {
      setActionLoading(null)
    }
  }, [t])

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.pageTitle')}
        description={t('dashboard.description')}
        actions={<TrainerDashboardActions />}
      />
      {loading ? (
        <TrainerSkeleton rows={6} />
      ) : error ? (
        <TrainerErrorState message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TrainerStatCard
              icon={<Users size={20} />}
              label={t('dashboard.stats.managedStudents')}
              value={students.length}
            />
            <TrainerStatCard
              icon={<CalendarDays size={20} />}
              label={t('dashboard.stats.todaySessions')}
              value={todaySessions.length}
            />
            <TrainerStatCard
              icon={<CheckCircle2 size={20} />}
              label={t('dashboard.stats.completedThisMonth')}
              value={completedThisMonth}
            />
            <TrainerStatCard
              icon={<Clock3 size={20} />}
              label={t('dashboard.stats.nextSession')}
              value={upcoming[0] ? formatDateTime(upcoming[0].startTime) : t('dashboard.stats.noUpcoming')}
            />
          </div>

          {/* Today's schedule — attendance panel */}
          <section className="rogym-card rogym-card--compact p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{t('dashboard.todaySchedule.title')}</h2>
                <p className="mt-0.5 text-sm rogym-text-dim">
                  {t('dashboard.todaySchedule.description')}
                </p>
              </div>
              <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/sessions">
                {t('dashboard.todaySchedule.allSessions')}
              </Link>
            </div>
            {actionError && (
              <p className="rogym-error-alert mb-4" role="alert">
                {actionError}
              </p>
            )}
            {todaySessions.length === 0 ? (
              <TrainerEmptyState
                title={t('dashboard.todaySchedule.noSessions')}
                description={t('dashboard.todaySchedule.noSessionsDesc')}
              />
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <TodaySessionRow
                    key={session.sessionId}
                    session={session}
                    isLoading={actionLoading === session.sessionId}
                    onOpen={handleOpenSession}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{t('dashboard.upcoming.title')}</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/sessions">
                  {t('dashboard.upcoming.viewAll')}
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <TrainerEmptyState title={t('dashboard.upcoming.noUpcoming')} />
              ) : (
                <div>
                  {groupedUpcoming.map((group, groupIdx) => (
                    <Fragment key={group.date}>
                      {groupIdx > 0 && <hr className="my-1 border-white/5" />}
                      {group.sessions.map((session) => (
                        <UpcomingSessionButton
                          key={session.sessionId}
                          session={session}
                          onOpen={handleOpenSession}
                        />
                      ))}
                    </Fragment>
                  ))}
                </div>
              )}
            </section>

            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{t('dashboard.expiring.title')}</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/students">
                  {t('dashboard.expiring.students')}
                </Link>
              </div>
              {expiringStudents.length === 0 ? (
                <TrainerEmptyState title={t('dashboard.expiring.noExpiring')} />
              ) : (
                <div className="space-y-3">
                  {visibleExpiringStudents.map((student) => (
                    <ExpiringStudentLink key={student.memberId} student={student} />
                  ))}
                </div>
              )}
            </section>
          </div>

        </>
      )}

      {openedSessionId && (
        <Suspense fallback={null}>
          <SessionDetailModal
            sessionId={openedSessionId}
            onClose={handleCloseSession}
            onUpdate={handleSessionUpdated}
          />
        </Suspense>
      )}
    </TrainerPage>
  )
}

function formatLocalDay(value: string): string {
  return LOCAL_DAY_FORMATTER.format(new Date(value))
}

function formatDayMonth(value: string): string {
  return DAY_MONTH_FORMATTER.format(new Date(value))
}
