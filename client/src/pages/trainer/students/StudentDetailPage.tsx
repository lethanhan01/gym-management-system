import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { SessionDetailModal } from '@/components/trainer/SessionDetailModal'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, ClipboardList, Plus, TrendingUp } from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getApiError } from '@/lib/api-error'
import { formatDate, formatDateTime, todayInput } from '@/lib/date'
import {
  memberService,
  type MemberProgress,
  type TrainerStudentDetail,
} from '@/services/member.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
} from '@/services/workout.service'
import {
  SubmitButton,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

type Tab = 'overview' | 'sessions' | 'workout'
const StudentProgressChart = lazy(() => import('@/components/charts/StudentProgressChart'))

export default function StudentDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'overview'
  const [student, setStudent] = useState<TrainerStudentDetail | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress[]>([])
  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignDate, setAssignDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentData, sessionResult, progressData, assignmentData, planData] =
        await Promise.all([
          memberService.getById(id),
          trainingService.getSessions({ memberId: id, pageSize: 100, sort: 'start_time:desc' }),
          memberService.getProgress(id, { limit: 100 }),
          workoutService.getAssignments(id, { limit: 20 }),
          workoutService.getPlans(),
        ])
      setStudent(studentData)
      setSessions(sessionResult.data)
      setProgress(progressData)
      setAssignments(assignmentData)
      setPlans(planData.filter((plan) => plan.status === 'active'))
      const firstActive = assignmentData.find((item) => item.status === 'active')
      setActivePlan(firstActive ? await workoutService.getPlan(firstActive.planId) : null)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải chi tiết học viên.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = useMemo(
    () =>
      [...progress].reverse().map((item) => ({
        date: formatDate(item.recordedAt),
        weight: item.weight ? Number(item.weight) : null,
        bmi: item.bmi ? Number(item.bmi) : null,
      })),
    [progress]
  )
  const activeSubscription = useMemo(
    () => student?.subscriptions.find((item) => item.status === 'active') ?? null,
    [student?.subscriptions]
  )
  const upcomingSession = useMemo(() => {
    const now = Date.now()
    return sessions.reduce<TrainingSession | undefined>((next, item) => {
      if (item.status !== 'scheduled') return next
      const startTime = new Date(item.startTime).getTime()
      if (startTime <= now) return next
      if (!next || startTime < new Date(next.startTime).getTime()) return item
      return next
    }, undefined)
  }, [sessions])
  const assignmentHistory = useMemo(
    () => assignments.filter((item) => item.status !== 'active'),
    [assignments]
  )
  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.status === 'active'),
    [assignments]
  )
  const latestProgress = progress[0]

  function selectTab(nextTab: Tab) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next)
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault()
    if (!assignPlanId) return
    setAssigning(true)
    setError(null)
    try {
      await workoutService.assignPlan(id, {
        planId: Number(assignPlanId),
        startDate: assignDate,
        notes: assignNotes.trim() || undefined,
      })
      setAssignOpen(false)
      setAssignNotes('')
      await load()
      selectTab('workout')
    } catch (err) {
      setError(getApiError(err, 'Không thể gán kế hoạch tập.'))
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign() {
    const target = activeAssignments[0]
    if (!target) return
    setUnassigning(true)
    try {
      await workoutService.unassignMember(target.assignmentId)
      setUnassignOpen(false)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Không thể gỡ gán giáo án.'))
    } finally {
      setUnassigning(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={6} />
      </TrainerPage>
    )
  if (error && !student)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!student) return null

  return (
    <TrainerPage>
      <Link
        to="/trainer/students"
        className="rogym-text-link mb-1 inline-flex items-center gap-1.5 text-xs rogym-text-dim hover:rogym-text-secondary"
      >
        <ArrowLeft size={13} /> Danh sách học viên
      </Link>
      <TrainerPageHeader
        eyebrow={student.memberCode}
        title={student.fullName}
        description={`${student.email} · ${student.phone ?? 'Chưa có số điện thoại'}`}
        actions={
          <>
            <Link
              className="rogym-btn rogym-btn--outline-white"
              to={`/trainer/sessions/create?memberId=${id}`}
            >
              <CalendarPlus size={16} /> Tạo buổi tập
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to={`/trainer/students/${id}/progress`}>
              <TrendingUp size={16} /> Ghi tiến độ
            </Link>
          </>
        }
      />
      {error && <TrainerErrorState message={error} onRetry={load} />}

      <div className="flex gap-2 overflow-x-auto border-b border-white/5 pb-3">
        {(
          [
            ['overview', 'Tổng quan'],
            ['sessions', 'Buổi tập'],
            ['workout', 'Giáo án'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={
              tab === key
                ? 'rogym-btn rogym-btn--primary whitespace-nowrap'
                : 'rogym-btn rogym-btn--outline-white whitespace-nowrap'
            }
            onClick={() => selectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">Hồ sơ cá nhân</h2>
            <Info label="Mã hội viên" value={student.memberCode} />
            <Info label="Email" value={student.email} />
            <Info label="Điện thoại" value={student.phone ?? 'Chưa cập nhật'} />
            <Info label="Ngày sinh" value={formatDate(student.dateOfBirth)} />
            <Info label="Địa chỉ" value={student.address ?? 'Chưa cập nhật'} />
          </section>

          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">Tình trạng tập luyện</h2>
            <Info
              label="Gói hiện tại"
              value={activeSubscription?.packageName ?? 'Chưa có gói active'}
            />
            <Info label="Hết hạn" value={formatDate(activeSubscription?.endDate)} />
            <Info label="Buổi tiếp theo" value={formatDateTime(upcomingSession?.startTime)} />
            <Info
              label="Cân nặng mới nhất"
              value={
                latestProgress?.weight
                  ? `${Number(latestProgress.weight).toFixed(1)} kg`
                  : 'Chưa ghi'
              }
            />
            <Info label="Mục tiêu" value={latestProgress?.goal ?? 'Chưa ghi'} />
          </section>

          {activeAssignments.map((assignment) => (
            <section
              key={assignment.assignmentId}
              className="rogym-card rogym-card--compact relative p-6 lg:col-span-2"
            >
              <span
                className={`absolute right-5 top-5 rounded-full border px-3 py-1 text-xs font-medium ${
                  assignment.assignedByStaffId
                    ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                    : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                }`}
              >
                {assignment.assignedByStaffId ? 'PT gán' : 'Plan cá nhân'}
              </span>
              <h2 className="mb-2 pr-28 text-lg font-bold text-white">
                {assignment.plan?.name ?? 'Giáo án không tìm thấy'}
              </h2>
              <p className="mb-4 text-sm rogym-text-secondary">
                {assignment.plan?.description ?? 'Không có mô tả'}
              </p>
              <button
                type="button"
                className="rogym-text-link text-xs"
                onClick={() => selectTab('workout')}
              >
                Chi tiết
              </button>
            </section>
          ))}

          <section className="rogym-card rogym-card--compact p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Tiến độ</h2>
              <Link
                className="rogym-btn rogym-btn--primary"
                to={`/trainer/students/${id}/progress`}
              >
                <Plus size={15} /> Ghi mới
              </Link>
            </div>
            {progress.length === 0 ? (
              <p className="text-sm rogym-text-secondary">Chưa có dữ liệu tiến độ.</p>
            ) : (
              <div className="h-64">
                <Suspense
                  fallback={<div className="h-full animate-pulse rounded-xl bg-white/5" />}
                >
                  <StudentProgressChart data={chartData} />
                </Suspense>
              </div>
            )}
          </section>

          {progress.length > 0 && (
            <section className="rogym-card rogym-card--compact p-5 lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-white">Lịch sử đo lường</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-2 text-left text-xs font-medium rogym-text-dim">Ngày ghi</th>
                      <th className="pb-2 text-right text-xs font-medium rogym-text-dim">Cân nặng</th>
                      <th className="pb-2 text-right text-xs font-medium rogym-text-dim">BMI</th>
                      <th className="pb-2 pl-4 text-left text-xs font-medium rogym-text-dim">Mục tiêu</th>
                      <th className="pb-2 pl-4 text-left text-xs font-medium rogym-text-dim">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((item) => (
                      <tr key={item.progressId} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 text-white">{formatDate(item.recordedAt)}</td>
                        <td className="py-2.5 text-right text-white">
                          {item.weight ? `${Number(item.weight).toFixed(1)} kg` : '—'}
                        </td>
                        <td className="py-2.5 text-right text-white">
                          {item.bmi ? Number(item.bmi).toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 pl-4 rogym-text-secondary">
                          {item.goal ?? '—'}
                        </td>
                        <td className="py-2.5 pl-4 rogym-text-secondary">
                          {item.notes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'sessions' &&
        (sessions.length === 0 ? (
          <TrainerEmptyState
            title="Chưa có buổi tập"
            action={
              <Link
                className="rogym-btn rogym-btn--primary"
                to={`/trainer/sessions/create?memberId=${id}`}
              >
                Tạo buổi đầu tiên
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => setOpenedSessionId(session.sessionId)}
                className="rogym-card rogym-card--compact flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div>
                  <div className="font-semibold text-white">
                    {formatDateTime(session.startTime)}
                  </div>
                  <div className="mt-1 text-sm rogym-text-secondary">
                    {session.roomName ?? 'Chưa có phòng'}
                  </div>
                </div>
                <TrainerStatusBadge status={session.status} />
              </button>
            ))}
          </div>
        ))}

      {tab === 'workout' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => setAssignOpen(true)}
            >
              <ClipboardList size={16} /> Gán giáo án mới
            </button>
          </div>
          {!activePlan ? (
            <TrainerEmptyState
              title="Chưa có giáo án active"
              description="Gán một kế hoạch đang active cho học viên này."
            />
          ) : (
            <section className="rogym-card rogym-card--compact p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{activePlan.name}</h2>
                  <p className="mt-2 text-sm rogym-text-secondary">
                    {activePlan.description ?? 'Không có mô tả'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {activeAssignments[0] && (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        activeAssignments[0].assignedByStaffId
                          ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                          : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                      }`}
                    >
                      {activeAssignments[0].assignedByStaffId ? 'PT gán' : 'Plan cá nhân'}
                    </span>
                  )}
                  {activeAssignments[0]?.assignedByStaffId && (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--danger rounded-full"
                      onClick={() => setUnassignOpen(true)}
                    >
                      Gỡ gán
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {activePlan.days?.map((day) => (
                  <div
                    key={day.planDayId}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <div className="font-semibold text-white">
                      {day.dayNumber}. {day.name}
                    </div>
                    <div className="mt-3 space-y-2">
                      {day.exercises?.map((item) => (
                        <div
                          key={item.planExerciseId}
                          className="rounded-xl bg-black/15 p-3 text-sm"
                        >
                          <div className="font-medium text-white">
                            {item.exercise?.name ?? 'Bài tập'}
                          </div>
                          <div className="mt-1 text-xs rogym-text-dim">
                            {item.targetSets} sets ·{' '}
                            {item.targetReps
                              ? `${item.targetReps} reps`
                              : `${item.targetDurationSec ?? 0}s`}
                            {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)}kg` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {assignmentHistory.length > 0 && (
            <section className="rogym-card rogym-card--compact p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Lịch sử gán giáo án</h2>
              <div className="space-y-3">
                {assignmentHistory.map((item) => (
                  <div
                    key={item.assignmentId}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {item.plan?.name ?? 'Giáo án đã xóa'}
                      </div>
                      <div className="text-xs rogym-text-dim">
                        Bắt đầu {formatDate(item.startDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          item.assignedByStaffId
                            ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                            : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                        }`}
                      >
                        {item.assignedByStaffId ? 'PT gán' : 'Plan cá nhân'}
                      </span>
                      <TrainerStatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <TrainerModal
        open={assignOpen}
        title="Gán giáo án"
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAssignOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="assign-plan-form" loading={assigning} disabled={!assignPlanId}>
              Gán giáo án
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-form" className="space-y-4" onSubmit={handleAssign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Kế hoạch active</span>
            <TrainerSelect value={assignPlanId} onValueChange={setAssignPlanId} required>
              <option value="">Chọn kế hoạch</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.name}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ngày bắt đầu</span>
            <DatePickerInput value={assignDate} onChange={(value) => setAssignDate(value)} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            Giáo án active hiện tại sẽ tự động chuyển sang trạng thái đã thay thế.
          </p>
          <button type="submit" className="hidden" />
        </form>
      </TrainerModal>

      <TrainerModal
        open={unassignOpen}
        title="Xác nhận gỡ gán giáo án"
        onClose={() => setUnassignOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setUnassignOpen(false)}
              disabled={unassigning}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              onClick={handleUnassign}
              disabled={unassigning}
            >
              {unassigning ? 'Đang gỡ...' : 'Gỡ gán'}
            </button>
          </>
        }
      >
        <p className="text-sm rogym-text-secondary">
          Bạn có chắc muốn gỡ giáo án{' '}
          <span className="font-semibold text-white">{activePlan?.name}</span> khỏi học viên này?
          Thao tác này không thể hoàn tác.
        </p>
      </TrainerModal>

      <SessionDetailModal
        sessionId={openedSessionId}
        onClose={() => setOpenedSessionId(null)}
        onUpdate={load}
      />
    </TrainerPage>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm rogym-text-dim">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  )
}
