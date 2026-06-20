import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Play,
} from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutPlanDay,
  type WorkoutPlanExercise,
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'

interface SetState {
  actualReps: string
  actualWeightKg: string
  actualDurationSec: string
  completed: boolean
}

function makeDefaultSets(ex: WorkoutPlanExercise): SetState[] {
  return Array.from({ length: ex.targetSets }, () => ({
    actualReps: ex.targetReps ? String(ex.targetReps) : '',
    actualWeightKg: ex.targetWeightKg ? String(Number(ex.targetWeightKg)) : '',
    actualDurationSec: ex.targetDurationSec ? String(ex.targetDurationSec) : '',
    completed: false,
  }))
}

// ── Left card: Plan list ───────────────────────────────────────────────────────

function PlanCardItem({
  assignment,
  plan,
  onStartDay,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  onStartDay: (day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPT = !!assignment.assignedByStaffId
  const totalDays = plan?.days?.length ?? assignment.plan?.days?.length ?? 0
  const totalExercises =
    plan?.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0

  const totalEstSec =
    plan?.days?.reduce(
      (s, d) =>
        s +
        (d.exercises?.reduce((es, ex) => {
          const setTime = (ex.targetDurationSec ?? 30) * ex.targetSets
          const restTime = (ex.restSeconds ?? 60) * (ex.targetSets - 1)
          return es + setTime + restTime
        }, 0) ?? 0),
      0
    ) ?? 0
  const avgMinPerDay = totalDays > 0 ? Math.round(totalEstSec / totalDays / 60) : 0

  return (
    <div className={`rogym-plan-card rogym-card rogym-card--md ${isPT ? 'is-trainer-plan' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`rogym-plan-source rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPT ? 'is-trainer-plan' : ''
                }`}
              >
                {isPT ? 'PT giao' : 'Cá nhân'}
              </span>
              <h3 className="truncate font-bold text-white">
                {assignment.plan?.name ?? plan?.name ?? '—'}
              </h3>
            </div>
            {plan?.description && (
              <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>
            )}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> ngày
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> bài tập
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> phút/ngày (ước tính)
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết ngày tập'}
        </button>
      </div>

      {expanded && plan?.days && (
        <div className="rogym-sx-8553bf9e">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div
                key={day.planDayId}
                className="flex items-center justify-between px-5 py-3 rogym-sx-6720cca7"
              >
                <div>
                  <p className="text-sm font-medium text-white">{day.name}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">{day.exercises?.length ?? 0} bài tập</p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary px-3 py-1.5 text-xs"
                  onClick={() => onStartDay(day, assignment)}
                >
                  <Play size={12} /> Bắt đầu
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Right card: Session view ───────────────────────────────────────────────────

function SessionView({
  day,
  sets,
  onUpdateSet,
  onFinish,
  submitting,
  submitError,
  done,
}: {
  day: WorkoutPlanDay
  sets: SetState[][]
  onUpdateSet: (exIdx: number, setIdx: number, field: keyof SetState, value: string | boolean) => void
  onFinish: () => void
  submitting: boolean
  submitError: string | null
  done: boolean
}) {
  const navigate = useNavigate()
  const sortedExercises = day.exercises
    ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
    : []
  const completedCount = sets.flat().filter((s) => s.completed).length
  const totalSets = sets.flat().length
  const anyCompleted = completedCount > 0

  if (done) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[20px] p-6 text-center rogym-sx-25952519">
        <CheckCircle2 size={48} className="rogym-sx-b2fbf853" />
        <h2 className="text-xl font-bold text-white">Buổi tập hoàn tất!</h2>
        <p className="text-sm rogym-sx-d88f932f">Kết quả đã được ghi nhận vào lịch sử tập luyện.</p>
        <div className="flex gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => navigate('/member/workout/plan')}
          >
            Về kế hoạch
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/history')}
          >
            Xem lịch sử
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] rogym-sx-25952519 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest rogym-sx-b2fbf853">{day.name}</p>
        <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">{sortedExercises.length} bài tập</p>
      </div>

      <div className="space-y-3 px-5 pb-4">
        {sortedExercises.map((ex, exIdx) => {
          const isCardio = ex.exercise?.category === 'cardio'
          return (
            <div key={ex.planExerciseId} className="rogym-sx-46079668">
              <div className="flex items-center gap-3 px-4 py-3 rogym-sx-dd0d9e7c">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">
                  {exIdx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{ex.exercise?.name ?? 'Bài tập'}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">
                    {ex.targetSets} sets ·{' '}
                    {isCardio
                      ? `${ex.targetDurationSec ?? 0} giây`
                      : `${ex.targetReps ?? 0} reps`}
                    {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="rogym-workout-set-grid mb-2 grid text-xs font-medium uppercase">
                  <span>Set</span>
                  <span>{isCardio ? 'Giây' : 'Reps'}</span>
                  <span>Kg</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {(sets[exIdx] ?? []).map((s, setIdx) => (
                    <div
                      key={setIdx}
                      className={`rogym-workout-set-grid grid items-center gap-2 ${s.completed ? 'is-completed' : ''}`}
                    >
                      <span className="rogym-workout-set-index text-sm font-medium">{setIdx + 1}</span>
                      <input
                        type="number"
                        className="rogym-input py-1.5 text-sm"
                        min={0}
                        value={isCardio ? s.actualDurationSec : s.actualReps}
                        onChange={(e) =>
                          onUpdateSet(
                            exIdx,
                            setIdx,
                            isCardio ? 'actualDurationSec' : 'actualReps',
                            e.target.value
                          )
                        }
                        placeholder={isCardio ? 'giây' : 'reps'}
                      />
                      <input
                        type="number"
                        className="rogym-input py-1.5 text-sm"
                        min={0}
                        step={0.25}
                        value={s.actualWeightKg}
                        onChange={(e) =>
                          onUpdateSet(exIdx, setIdx, 'actualWeightKg', e.target.value)
                        }
                        placeholder="kg"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateSet(exIdx, setIdx, 'completed', !s.completed)}
                        className="rogym-workout-set-toggle"
                      >
                        {s.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {submitError && (
        <p className="px-5 pb-2 text-center text-xs text-red-300">{submitError}</p>
      )}

      <div className="rogym-sx-8553bf9e flex items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm rogym-sx-d88f932f">
          {completedCount} / {totalSets} set hoàn thành
        </p>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          disabled={!anyCompleted || submitting}
          onClick={onFinish}
        >
          {submitting ? 'Đang lưu...' : 'Kết thúc buổi tập'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CreateWorkoutSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [fullPlans, setFullPlans] = useState<Map<string, WorkoutPlan>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDay, setSelectedDay] = useState<WorkoutPlanDay | null>(null)
  const [selectedAssignment, setSelectedAssignment] =
    useState<WorkoutAssignmentSummary | null>(null)
  const [sets, setSets] = useState<SetState[][]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const all = await workoutService.getAssignments(memberId)
      const active = all.filter((a) => a.status === 'active')
      setAssignments(active)
      const pairs = await Promise.all(
        active.map(async (a) => {
          try {
            const plan = await workoutService.getPlan(a.planId)
            return [a.planId, plan] as const
          } catch {
            return null
          }
        })
      )
      const planMap = new Map<string, WorkoutPlan>()
      for (const pair of pairs) {
        if (pair) planMap.set(pair[0], pair[1])
      }
      setFullPlans(planMap)
    } catch {
      setError('Không thể tải kế hoạch tập.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  function handleStartDay(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
    setSelectedDay(day)
    setSelectedAssignment(assignment)
    setDone(false)
    setSubmitError(null)
    if (day.exercises) {
      setSets(
        [...day.exercises]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(makeDefaultSets)
      )
    } else {
      setSets([])
    }
  }

  function updateSet(
    exIdx: number,
    setIdx: number,
    field: keyof SetState,
    value: string | boolean
  ) {
    setSets((prev) => {
      const next = prev.map((s) => [...s])
      next[exIdx][setIdx] = { ...next[exIdx][setIdx], [field]: value }
      return next
    })
  }

  async function handleFinish() {
    if (!selectedAssignment || !selectedDay) return
    setSubmitting(true)
    setSubmitError(null)
    const exercises = selectedDay.exercises
      ? [...selectedDay.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
      : []
    const logSets = exercises.flatMap((ex, exIdx) =>
      (sets[exIdx] ?? []).map((s, setIdx) => ({
        planExerciseId: Number(ex.planExerciseId),
        setNumber: setIdx + 1,
        actualReps: s.actualReps ? Number(s.actualReps) : undefined,
        actualWeightKg: s.actualWeightKg ? Number(s.actualWeightKg) : undefined,
        actualDurationSec: s.actualDurationSec ? Number(s.actualDurationSec) : undefined,
        completed: s.completed,
      }))
    )
    try {
      await workoutService.createLog({
        assignmentId: Number(selectedAssignment.assignmentId),
        planDayId: Number(selectedDay.planDayId),
        loggedAt: new Date().toISOString(),
        sets: logSets,
      })
      setDone(true)
    } catch {
      setSubmitError('Không thể lưu buổi tập. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Tập luyện"
        title="Tạo buổi tập"
        description="Chọn một buổi tập từ kế hoạch của bạn để bắt đầu."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: plan list */}
        <div className="space-y-4">
          {loading ? (
            <MemberSkeleton rows={5} />
          ) : error ? (
            <MemberErrorState message={error} onRetry={load} />
          ) : assignments.length === 0 ? (
            <MemberEmptyState
              title="Bạn chưa có kế hoạch tập"
              description="Tạo kế hoạch cá nhân để bắt đầu tập luyện."
              action={
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary"
                  onClick={() => navigate('/member/workout/builder')}
                >
                  <Dumbbell size={14} /> Tạo plan
                </button>
              }
            />
          ) : (
            assignments.map((a) => (
              <PlanCardItem
                key={a.assignmentId}
                assignment={a}
                plan={fullPlans.get(a.planId) ?? null}
                onStartDay={handleStartDay}
              />
            ))
          )}
        </div>

        {/* Right: session or placeholder */}
        <div>
          {!selectedDay ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[20px] p-6 text-center rogym-sx-25952519">
              <Dumbbell size={36} className="rogym-sx-ed519d00" />
              <p className="text-sm font-medium text-white">
                Vui lòng chọn 1 buổi tập trong plan của bạn để bắt đầu
              </p>
              <p className="text-xs rogym-sx-5e5c39ab">
                Nhấn &quot;Bắt đầu&quot; ở buổi tập bên trái.
              </p>
            </div>
          ) : (
            <SessionView
              day={selectedDay}
              sets={sets}
              onUpdateSet={updateSet}
              onFinish={() => void handleFinish()}
              submitting={submitting}
              submitError={submitError}
              done={done}
            />
          )}
        </div>
      </div>
    </MemberPage>
  )
}
