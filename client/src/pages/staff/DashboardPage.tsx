import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, LogIn, LogOut, MessageSquare, Timer, Users } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import {
  formatDate,
  formatTime,
  todayInput,
  startOfLocalDayIso,
  endOfLocalDayIso,
} from '@/lib/date'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { memberService } from '@/services/member.service'
import { staffService, type StaffProfile } from '@/services/staff.service'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import { type StaffAttendanceLog } from '@/services/staffAttendance.service'
import { useStaffAttendanceStore } from '@/stores/staffAttendanceStore'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatCard,
  StaffStatusBadge,
} from '@/components/StaffUI'

// ── Staff attendance widget ────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const StaffAttendanceWidget = memo(function StaffAttendanceWidget({
  openLog,
  todayLogs,
  actionLoading,
  actionError,
  onCheckIn,
  onCheckOut,
}: {
  openLog: StaffAttendanceLog | null
  todayLogs: StaffAttendanceLog[]
  actionLoading: boolean
  actionError: string | null
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

  const totalMinutes = useMemo(
    () =>
      todayLogs
        .filter((l) => l.durationMinutes !== null)
        .reduce((acc, l) => acc + (l.durationMinutes ?? 0), 0),
    [todayLogs]
  )

  return (
    <section className="rogym-card rogym-card--compact p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Chấm công hôm nay</h2>
        <Link to="/staff/attendance" className="rogym-text-link rogym-text-link--accent text-xs">
          Xem chi tiết →
        </Link>
      </div>

      {openLog ? (
        <div className="rounded-xl bg-white/5 p-4 space-y-2">
          <div className="flex items-center gap-2 rogym-text-accent">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold">Đang làm việc</span>
          </div>
          <div className="flex items-center gap-2 rogym-text-dim text-xs">
            <LogIn size={12} />
            <span>Vào lúc {fmtTime(openLog.checkIn)}</span>
          </div>
          {elapsed && (
            <div className="flex items-center gap-2 text-sm text-white">
              <Timer size={13} className="rogym-sx-f27dac31" />
              <span className="font-mono font-semibold">{elapsed}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 p-4">
          <div className="flex items-center gap-2 rogym-text-dim text-sm">
            <div className="h-2 w-2 rounded-full bg-white/20" />
            <span>Chưa chấm công hôm nay</span>
          </div>
        </div>
      )}

      {totalMinutes > 0 && (
        <div className="flex items-center gap-2 text-xs rogym-text-dim">
          <Clock size={12} />
          <span>
            Đã làm {Math.floor(totalMinutes / 60) > 0 ? `${Math.floor(totalMinutes / 60)}g ` : ''}
            {totalMinutes % 60 > 0 ? `${totalMinutes % 60}p` : ''}
          </span>
        </div>
      )}

      {actionError && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{actionError}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          type="button"
          onClick={onCheckIn}
          disabled={actionLoading || !!openLog}
          className="rogym-btn rogym-btn--primary flex items-center justify-center gap-1.5 text-sm py-2 disabled:opacity-40"
        >
          {actionLoading && !openLog ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <LogIn size={14} />
          )}
          Chấm vào
        </button>
        <button
          type="button"
          onClick={onCheckOut}
          disabled={actionLoading || !openLog}
          className="rogym-btn rogym-btn--danger flex items-center justify-center gap-1.5 text-sm py-2 disabled:opacity-40"
        >
          {actionLoading && !!openLog ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <LogOut size={14} />
          )}
          Chấm ra
        </button>
      </div>
    </section>
  )
})

const MemberCheckInRow = memo(function MemberCheckInRow({ log }: { log: AttendanceLog }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-3">
      <div>
        <div className="text-sm font-semibold text-white">{log.memberName}</div>
        <div className="mt-0.5 text-xs rogym-text-dim">{log.memberCode}</div>
      </div>
      <div className="text-right text-xs rogym-text-secondary">
        {formatTime(log.startTime)}
        {log.endTime && ` – ${formatTime(log.endTime)}`}
      </div>
    </div>
  )
})

const PendingFeedbackRow = memo(function PendingFeedbackRow({ feedback }: { feedback: Feedback }) {
  return (
    <div className="rounded-xl border border-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white line-clamp-2">{feedback.content}</div>
        <StaffStatusBadge
          status={feedback.severity}
          tone={
            feedback.severity === 'high'
              ? 'danger'
              : feedback.severity === 'medium'
                ? 'warning'
                : 'muted'
          }
        />
      </div>
      <div className="mt-1 text-xs rogym-text-dim">
        {formatDate(feedback.createdAt)} · {feedbackTypeLabel(feedback.feedbackType)}
      </div>
    </div>
  )
})

// ── Main page ──────────────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceLog[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Staff own attendance — nguồn sự thật chung với màn Chấm công.
  const openLog = useStaffAttendanceStore((s) => s.openLog)
  const todayStaffLogs = useStaffAttendanceStore((s) => s.todayLogs)
  const attendanceActionLoading = useStaffAttendanceStore((s) => s.actionLoading)
  const attendanceActionError = useStaffAttendanceStore((s) => s.actionError)
  const loadAttendance = useStaffAttendanceStore((s) => s.load)
  const handleCheckIn = useStaffAttendanceStore((s) => s.checkIn)
  const handleCheckOut = useStaffAttendanceStore((s) => s.checkOut)

  useEffect(() => {
    const today = todayInput()
    const from = startOfLocalDayIso(today)
    const to = endOfLocalDayIso(today)
    void loadAttendance()
    Promise.all([
      staffService.getMe(),
      trainingService.getAttendance({ from, to, pageSize: 20 }),
      feedbackService.list({ status: 'open', pageSize: 20 }),
      memberService.list({ pageSize: 1 }),
    ])
      .then(([profileData, attendanceResult, feedbackResult, memberResult]) => {
        setProfile(profileData)
        setAttendance(attendanceResult.data)
        setFeedbacks(feedbackResult.data)
        setMemberTotal(memberResult.total)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải tổng quan.')))
      .finally(() => setLoading(false))
  }, [loadAttendance])

  const pendingFeedback = useMemo(() => feedbacks.filter((f) => f.status === 'open'), [feedbacks])
  const visibleAttendance = useMemo(() => attendance.slice(0, 8), [attendance])
  const visiblePendingFeedback = useMemo(() => pendingFeedback.slice(0, 6), [pendingFeedback])

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Staff workspace"
        title="Tổng quan hôm nay"
        description={`Xin chào${profile ? `, ${profile.fullName}` : ''}. Đây là tình trạng hoạt động hôm nay.`}
      />

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : (
        <>
          {/* Top row: 3 stat cards + attendance widget (wider) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.5fr]">
            <StaffStatCard
              icon={<Users size={20} />}
              label="Tổng hội viên"
              value={memberTotal}
              to="/staff/members"
            />
            <StaffStatCard
              icon={<CheckCircle2 size={20} />}
              label="Check-in hôm nay"
              value={attendance.length}
              hint="Lượt vào trong ngày"
              to="/staff/check-in"
            />
            <StaffStatCard
              icon={<MessageSquare size={20} />}
              label="Phản hồi chờ xử lý"
              value={pendingFeedback.length}
              hint={pendingFeedback.length > 0 ? 'Cần xử lý sớm' : 'Tất cả đã xử lý'}
              to="/staff/feedback"
            />
            <StaffAttendanceWidget
              openLog={openLog}
              todayLogs={todayStaffLogs}
              actionLoading={attendanceActionLoading}
              actionError={attendanceActionError}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          </div>

          {/* Bottom row: check-in list + feedback list */}
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Check-in hội viên</h2>
                <Link
                  className="rogym-text-link rogym-text-link--accent text-sm"
                  to="/staff/check-in"
                >
                  Xem tất cả
                </Link>
              </div>
              {attendance.length === 0 ? (
                <StaffEmptyState title="Chưa có check-in hôm nay" />
              ) : (
                <div className="space-y-2">
                  {visibleAttendance.map((log) => (
                    <MemberCheckInRow key={log.attendanceId} log={log} />
                  ))}
                </div>
              )}
            </section>

            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Phản hồi cần xử lý</h2>
                <Link
                  className="rogym-text-link rogym-text-link--accent text-sm"
                  to="/staff/feedback"
                >
                  Xem tất cả
                </Link>
              </div>
              {pendingFeedback.length === 0 ? (
                <StaffEmptyState title="Không có phản hồi mới" />
              ) : (
                <div className="space-y-2">
                  {visiblePendingFeedback.map((fb) => (
                    <PendingFeedbackRow key={fb.feedbackId} feedback={fb} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </StaffPage>
  )
}

function feedbackTypeLabel(type: string) {
  if (type === 'staff') return 'Nhân viên'
  if (type === 'equipment') return 'Thiết bị'
  return 'Dịch vụ'
}
