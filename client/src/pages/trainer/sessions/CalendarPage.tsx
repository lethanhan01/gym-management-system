import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

  // ── List ──────────────────────────────────────────────────────────────────
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
        eyebrow="Lịch dạy"
        title="Lịch buổi tập"
        description="Theo dõi lịch theo ngày hoặc theo tuần, giờ hiển thị theo múi giờ Việt Nam."
        actions={
          <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
            <CalendarPlus size={16} /> Tạo buổi tập
          </Link>
        }
      />

      {/* Calendar toolbar */}
      <div className="rogym-card rogym-card--compact flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={() => moveCalendar(-1)}
            aria-label="Kỳ trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => setAnchor(new Date())}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={() => moveCalendar(1)}
            aria-label="Kỳ sau"
          >
            <ChevronRight size={18} />
          </button>
          <span className="ml-2 text-sm font-semibold rogym-text-primary">
            {formatDate(calRange.from)}
            {calView === 'week'
              ? ` - ${formatDate(new Date(calRange.to.getTime() - 1))}`
              : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={
              calView === 'day'
                ? 'rogym-btn rogym-btn--primary'
                : 'rogym-btn rogym-btn--outline-white'
            }
            onClick={() => setCalView('day')}
          >
            Ngày
          </button>
          <button
            type="button"
            className={
              calView === 'week'
                ? 'rogym-btn rogym-btn--primary'
                : 'rogym-btn rogym-btn--outline-white'
            }
            onClick={() => setCalView('week')}
          >
            Tuần
          </button>
        </div>
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
                      <span className="rogym-today-badge" aria-label="Hôm nay">
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
                        {session.roomName ?? 'Chưa xếp phòng'}
                      </div>
                      <div className="mt-2">
                        <TrainerStatusBadge status={session.status} />
                      </div>
                    </button>
                  ))}
                  {daySessions.length === 0 && (
                    <p className="py-6 text-center text-xs rogym-text-muted">
                      Không có lịch
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
        <h2 className="text-base font-bold text-white">Danh sách buổi tập</h2>

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
            <option value="">Mọi phòng tập</option>
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
            <option value="">Mọi trạng thái</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </TrainerSelect>
          <DatePickerInput
            aria-label="Từ ngày"
            value={listFrom}
            onChange={setListFilter(setListFrom)}
          />
          <DatePickerInput
            aria-label="Đến ngày"
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
            title="Chưa có buổi tập"
            description="Thay đổi bộ lọc để xem kết quả."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                  <tr>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">Học viên</th>
                    <th className="px-5 py-4">Phòng</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
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
                        {session.roomName ?? 'Chưa xếp phòng'}
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
                          Chi tiết
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
                    <MapPin size={15} /> {session.roomName ?? 'Chưa xếp phòng'}
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
              className="rogym-btn rogym-btn--outline-white"
              disabled={listPage <= 1}
              onClick={() => setListPage((p) => p - 1)}
            >
              Trước
            </button>
            <span className="text-sm rogym-text-secondary">
              Trang {listPage}/{listTotalPages}
            </span>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              disabled={listPage >= listTotalPages}
              onClick={() => setListPage((p) => p + 1)}
            >
              Sau
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
