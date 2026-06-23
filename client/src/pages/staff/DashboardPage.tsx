import { memo, useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('staff')
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
        <h2 className="text-base font-bold text-white">{t('dashboard.attendanceToday')}</h2>
        <Link to="/staff/attendance" className="rogym-text-link rogym-text-link--accent text-xs">
          {t('dashboard.viewDetail')}
        </Link>
      </div>

      {openLog ? (
        <div className="rounded-xl bg-white/5 p-4 space-y-2">
          <div className="flex items-center gap-2 rogym-text-accent">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold">{t('dashboard.working')}</span>
          </div>
          <div className="flex items-center gap-2 rogym-text-dim text-xs">
            <LogIn size={12} />
            <span>{t('dashboard.checkedInAt', { time: fmtTime(openLog.checkIn) })}</span>
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
            <span>{t('dashboard.notCheckedIn')}</span>
          </div>
        </div>
      )}

      {totalMinutes > 0 && (
        <div className="flex items-center gap-2 text-xs rogym-text-dim">
          <Clock size={12} />
          <span>
            {t('dashboard.workedTime', {
              hours: Math.floor(totalMinutes / 60),
              minutes: totalMinutes % 60,
            })}
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
          {t('dashboard.clockIn')}
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
          {t('dashboard.clockOut')}
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
  const { t } = useTranslation('staff')
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
        {formatDate(feedback.createdAt)} · {feedbackTypeLabel(feedback.feedbackType, t)}
      </div>
    </div>
  )
})

// ── Main page ──────────────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
  const { t } = useTranslation('staff')
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
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.todayOverview')}
        description={t('dashboard.greeting', { name: profile ? `, ${profile.fullName}` : '' })}
      />

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : (
        <>
          {/* Top row: 3 stat cards + attendance widget — 2 cột từ mobile, 4 cột ở desktop */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-[1fr_1fr_1fr_1.5fr]">
            <StaffStatCard
              icon={<Users size={20} />}
              label={t('dashboard.totalMembers')}
              value={memberTotal}
              to="/staff/members"
            />
            <StaffStatCard
              icon={<CheckCircle2 size={20} />}
              label={t('dashboard.checkInToday')}
              value={attendance.length}
              hint={t('dashboard.checkInCount')}
              to="/staff/check-in"
            />
            <StaffStatCard
              icon={<MessageSquare size={20} />}
              label={t('dashboard.pendingFeedback')}
              value={pendingFeedback.length}
              hint={pendingFeedback.length > 0 ? t('dashboard.urgentHandle') : t('dashboard.allHandled')}
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
                <h2 className="text-lg font-bold text-white">{t('dashboard.memberCheckIns')}</h2>
                <Link
                  className="rogym-text-link rogym-text-link--accent text-sm"
                  to="/staff/check-in"
                >
                  {t('dashboard.viewAll')}
                </Link>
              </div>
              {attendance.length === 0 ? (
                <StaffEmptyState title={t('dashboard.noCheckIns')} />
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
                <h2 className="text-lg font-bold text-white">{t('dashboard.pendingFeedbackSection')}</h2>
                <Link
                  className="rogym-text-link rogym-text-link--accent text-sm"
                  to="/staff/feedback"
                >
                  {t('dashboard.viewAll')}
                </Link>
              </div>
              {pendingFeedback.length === 0 ? (
                <StaffEmptyState title={t('dashboard.noFeedback')} />
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

function feedbackTypeLabel(type: string, t: TFunction<'staff'>) {
  if (type === 'staff') return t('feedback.staff')
  if (type === 'equipment') return t('feedback.equipment')
  return t('feedback.service')
}
