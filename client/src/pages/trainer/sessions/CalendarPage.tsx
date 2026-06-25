import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { SessionDetailModal } from '@/components/trainer/SessionDetailModal'
import { DatePickerInput } from '@/components/DatePickerInput'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import {
  endOfLocalDayIso,
  formatDate,
  formatDateTime,
  formatTime,
  startOfLocalDayIso,
  toDateInput,
  todayInput,
} from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import {
  StudentCombobox,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

function startOfWeekVN(value: Date) {
  const vnDateStr = toDateInput(value)
  const vnDate = new Date(`${vnDateStr}T00:00:00+07:00`)
  const day = vnDate.getDay()
  vnDate.setDate(vnDate.getDate() - (day === 0 ? 6 : day - 1))
  return vnDate
}

const LIST_PAGE_SIZE = 12

export default function TrainerSessionsPage() {
  const { t } = useTranslation('trainer')

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [anchor, setAnchor] = useState(() => new Date())
  const [calView, setCalView] = useState<'week' | 'day'>('week')
  const todayStr = todayInput()

  const calRange = useMemo(() => {
    const from =
      calView === 'week'
        ? startOfWeekVN(anchor)
        : new Date(`${toDateInput(anchor)}T00:00:00+07:00`)
    const to = new Date(from)
    to.setDate(to.getDate() + (calView === 'week' ? 7 : 1))
    return { from, to }
  }, [anchor, calView])

  const {
    data: calData,
    loading: calLoading,
    error: calError,
    reload: calReload,
  } = useTrainerSessions({
    from: calRange.from.toISOString(),
    to: calRange.to.toISOString(),
    pageSize: 100,
    sort: 'start_time:asc',
  })

  const calDays = useMemo(
    () =>
      Array.from({ length: calView === 'week' ? 7 : 1 }, (_, i) => {
        const d = new Date(calRange.from)
        d.setDate(d.getDate() + i)
        return d
      }),
    [calRange.from, calView],
  )

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, typeof calData>()
    for (const s of calData) {
      const key = toDateInput(s.startTime)
      const existing = map.get(key)
      if (existing) existing.push(s)
      else map.set(key, [s])
    }
    return map
  }, [calData])

  function moveCalendar(direction: number) {
    const next = new Date(anchor)
    next.setDate(next.getDate() + direction * (calView === 'week' ? 7 : 1))
    setAnchor(next)
  }

  // ── List ──────────────────────────────────────────────────────────────────
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [listPage, setListPage] = useState(1)
  const [listMemberId, setListMemberId] = useState('')
  const [listRoomId, setListRoomId] = useState('')
  const [listStatus, setListStatus] = useState('')
  const [listFrom, setListFrom] = useState('')
  const [listTo, setListTo] = useState('')
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const { data: students } = useTrainerStudents({ pageSize: 100 })

  useEffect(() => {
    facilityService
      .listRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
  }, [])

  function setListFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setListPage(1)
    }
  }

  const {
    data: listData,
    total: listTotal,
    loading: listLoading,
    error: listError,
    reload: listReload,
  } = useTrainerSessions({
    page: listPage,
    pageSize: LIST_PAGE_SIZE,
    memberId: listMemberId || undefined,
    roomId: listRoomId || undefined,
    status: listStatus || undefined,
    from: listFrom ? startOfLocalDayIso(listFrom) : undefined,
    to: listTo ? endOfLocalDayIso(listTo) : undefined,
    sort: 'start_time:desc',
  })

  const listTotalPages = Math.max(1, Math.ceil(listTotal / LIST_PAGE_SIZE))

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('sessions.calendar.eyebrow')}
        title={t('sessions.calendar.title')}
        description={t('sessions.calendar.description')}
        actions={
          <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
            <CalendarPlus size={16} /> {t('sessions.calendar.createSession')}
          </Link>
        }
      />

      {/* Calendar toolbar */}
      <div className="rogym-card rogym-card--compact flex flex-col gap-2 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--elevated"
              onClick={() => moveCalendar(-1)}
              aria-label={t('sessions.calendar.prevPeriod')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white text-sm px-3 py-1.5"
              onClick={() => setAnchor(new Date())}
            >
              {t('sessions.calendar.today')}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--elevated"
              onClick={() => moveCalendar(1)}
              aria-label={t('sessions.calendar.nextPeriod')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex rounded-full bg-white/10 p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCalView('day')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 sm:px-4 sm:py-1.5 sm:text-sm ${
                calView === 'day'
                  ? 'bg-[var(--rogym-green)] text-black'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {t('sessions.calendar.dayView')}
            </button>
            <button
              type="button"
              onClick={() => setCalView('week')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 sm:px-4 sm:py-1.5 sm:text-sm ${
                calView === 'week'
                  ? 'bg-[var(--rogym-green)] text-black'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {t('sessions.calendar.weekView')}
            </button>
          </div>
        </div>
        <span className="text-sm font-semibold rogym-text-primary">
          {formatDate(calRange.from)}
          {calView === 'week'
            ? ` – ${formatDate(new Date(calRange.to.getTime() - 1))}`
            : ''}
        </span>
      </div>

      {/* Calendar grid */}
      {calLoading ? (
        <TrainerSkeleton rows={5} />
      ) : calError ? (
        <TrainerErrorState message={calError} onRetry={calReload} />
      ) : (
        <div className={`grid gap-3 ${calView === 'week' ? 'lg:grid-cols-7' : ''}`}>
          {calDays.map((day) => {
            const dayKey = toDateInput(day)
            const isToday = dayKey === todayStr
            const daySessions = sessionsByDay.get(dayKey) ?? []

            return (
              <section
                key={day.toISOString()}
                className={`rogym-card rogym-card--compact min-h-52 p-3 ${isToday ? 'rogym-today-col' : ''}`}
              >
                <div
                  className={`border-b pb-3 text-sm font-semibold ${
                    isToday
                      ? 'rogym-today-col__header'
                      : 'border-white/5 rogym-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{formatDate(day)}</span>
                    {isToday && (
                      <span className="rogym-today-badge" aria-label={t('sessions.calendar.today')}>
                        Today
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {daySessions.map((session) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => setOpenedId(session.sessionId)}
                      className={`rogym-calendar-session block w-full rounded-xl p-3 text-left ${
                        toDateInput(session.startTime) === todayStr ? 'is-today' : ''
                      }`}
                    >
                      <span className="text-xs font-semibold rogym-text-accent">
                        {formatTime(session.startTime)}
                      </span>
                      <div className="mt-1 truncate text-sm font-medium rogym-text-primary">
                        {session.memberName}
                      </div>
                      <div className="mt-1 truncate text-xs rogym-text-muted">
                        {session.roomName ?? t('sessions.calendar.noRoom')}
                      </div>
                      <div className="mt-2">
                        <TrainerStatusBadge status={session.status} />
                      </div>
                    </button>
                  ))}
                  {daySessions.length === 0 && (
                    <p className="py-6 text-center text-xs rogym-text-muted">
                      {t('sessions.calendar.noSession')}
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* List section */}
      <section className="rogym-card rogym-card--compact p-5 space-y-4">
        <h2 className="text-base font-bold text-white">{t('sessions.calendar.list.title')}</h2>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StudentCombobox
            students={students}
            value={listMemberId}
            onChange={setListFilter(setListMemberId)}
          />
          <TrainerSelect
            value={listRoomId}
            onValueChange={setListFilter(setListRoomId)}
          >
            <option value="">{t('sessions.calendar.list.allRooms')}</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomCode} - {room.name}
              </option>
            ))}
          </TrainerSelect>
          <TrainerSelect
            value={listStatus}
            onValueChange={setListFilter(setListStatus)}
          >
            <option value="">{t('sessions.calendar.list.allStatuses')}</option>
            <option value="scheduled">{t('sessions.calendar.list.scheduled')}</option>
            <option value="in_progress">{t('sessions.calendar.list.inProgress')}</option>
            <option value="completed">{t('sessions.calendar.list.completed')}</option>
            <option value="cancelled">{t('sessions.calendar.list.cancelled')}</option>
          </TrainerSelect>
          <DatePickerInput
            aria-label={t('sessions.calendar.list.fromDate')}
            value={listFrom}
            onChange={setListFilter(setListFrom)}
          />
          <DatePickerInput
            aria-label={t('sessions.calendar.list.toDate')}
            value={listTo}
            onChange={setListFilter(setListTo)}
          />
        </div>

        {listLoading ? (
          <TrainerSkeleton rows={3} />
        ) : listError ? (
          <TrainerErrorState message={listError} onRetry={listReload} />
        ) : listData.length === 0 ? (
          <TrainerEmptyState
            title={t('sessions.calendar.list.noSessions')}
            description={t('sessions.calendar.list.noSessionsDesc')}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                  <tr>
                    <th className="px-5 py-4">{t('sessions.calendar.list.colTime')}</th>
                    <th className="px-5 py-4">{t('sessions.calendar.list.colStudent')}</th>
                    <th className="px-5 py-4">{t('sessions.calendar.list.colRoom')}</th>
                    <th className="px-5 py-4">{t('sessions.calendar.list.colStatus')}</th>
                    <th className="px-5 py-4 text-right">{t('sessions.calendar.list.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {listData.map((session) => (
                    <tr
                      key={session.sessionId}
                      className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                    >
                      <td className="px-5 py-4 text-white">
                        {formatDateTime(session.startTime)}
                      </td>
                      <td className="px-5 py-4 rogym-text-secondary">
                        {session.memberName}
                      </td>
                      <td className="px-5 py-4 rogym-text-secondary">
                        {session.roomName ?? t('sessions.calendar.noRoom')}
                      </td>
                      <td className="px-5 py-4">
                        <TrainerStatusBadge status={session.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="rogym-text-link rogym-text-link--accent"
                          onClick={() => setOpenedId(session.sessionId)}
                        >
                          {t('sessions.calendar.list.detail')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {listData.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => setOpenedId(session.sessionId)}
                  className="rogym-card rogym-card--compact w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{session.memberName}</div>
                      <div className="mt-1 text-sm rogym-text-secondary">
                        {formatDateTime(session.startTime)}
                      </div>
                    </div>
                    <TrainerStatusBadge status={session.status} />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm rogym-text-dim">
                    <MapPin size={15} /> {session.roomName ?? t('sessions.calendar.noRoom')}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {listTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--outline-white"
              disabled={listPage <= 1}
              onClick={() => setListPage((p) => p - 1)}
              aria-label={t('sessions.calendar.list.prevPage')}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm rogym-text-secondary">
              {t('sessions.calendar.list.page', { current: listPage, total: listTotalPages })}
            </span>
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--outline-white"
              disabled={listPage >= listTotalPages}
              onClick={() => setListPage((p) => p + 1)}
              aria-label={t('sessions.calendar.list.nextPage')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </section>

      {openedId && (
        <SessionDetailModal
          sessionId={openedId}
          onClose={() => setOpenedId(null)}
          onUpdate={() => {
            calReload()
            listReload()
          }}
        />
      )}
    </TrainerPage>
  )
}
