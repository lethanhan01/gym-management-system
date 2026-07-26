import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
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

// ── Plan card list ─────────────────────────────────────────────────────────────

function PlanCardItem({
  assignment,
  plan,
  onStartDay,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  onStartDay: (day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) => void
}) {
  const { t } = useTranslation('member')
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
            <div className="flex flex-col items-start gap-2">
              <span
                className={`rogym-plan-source rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPT ? 'is-trainer-plan' : ''
                }`}
              >
                {isPT ? t('workout.createSession.sourceTrainer') : t('workout.createSession.sourcePersonal')}
              </span>
              <h3 className="break-words font-bold text-white">
                {assignment.plan?.name ?? plan?.name ?? '—'}
              </h3>
            </div>
            {plan?.description && (
              <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>
            )}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> {t('workout.createSession.unitDays')}
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> {t('workout.createSession.unitExercises')}
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> {t('workout.createSession.unitMinPerDay')}
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
          {expanded ? t('workout.createSession.buttonHideDetail') : t('workout.createSession.buttonShowDetail')}
        </button>
      </div>

      {expanded && plan?.days && (
        <div className="rogym-sx-8553bf9e">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div
                key={day.planDayId}
                className="flex items-center justify-between gap-3 px-5 py-3 rogym-sx-6720cca7"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white">{day.name}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">{day.exercises?.length ?? 0} {t('workout.createSession.unitExercises')}</p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary rogym-btn--icon shrink-0"
                  onClick={() => onStartDay(day, assignment)}
                  aria-label={t('workout.createSession.buttonStartDay', { name: day.name })}
                  title={t('workout.createSession.buttonStartDay', { name: day.name })}
                >
                  <Play size={16} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Session view ────────────────────────────────────────────────────────────────

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
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const sortedExercises = day.exercises
    ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
    : []
  const totalSets = sets.flat().length
  const completedCount = totalSets
  const canFinish = totalSets > 0

  if (done) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[20px] p-6 text-center rogym-sx-25952519">
        <CheckCircle2 size={48} className="rogym-sx-b2fbf853" />
        <h2 className="text-xl font-bold text-white">{t('workout.createSession.completedTitle')}</h2>
        <p className="text-sm rogym-sx-d88f932f">{t('workout.createSession.completedDesc')}</p>
        <div className="flex gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => navigate('/member/workout/plan')}
          >
            {t('workout.createSession.buttonGoToPlan')}
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/history')}
          >
            {t('workout.createSession.buttonViewHistory')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] rogym-sx-25952519 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest rogym-sx-b2fbf853">{day.name}</p>
        <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">{sortedExercises.length} {t('workout.createSession.unitExercises')}</p>
      </div>

      <div className="space-y-3 px-5 pb-4">
        {sortedExercises.map((ex, exIdx) => {
          const isCardio = ex.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
          const exerciseSets = sets[exIdx] ?? []
          return (
            <div key={ex.planExerciseId} className="rogym-sx-46079668">
              <div className="flex items-center gap-3 px-4 py-3 rogym-sx-dd0d9e7c">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">
                  {exIdx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{ex.exercise?.name ?? t('workout.session.defaultExerciseName')}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">
                    {ex.targetSets} sets ·{' '}
                    {isCardio
                      ? `${ex.targetDurationSec ?? 0} ${t('workout.createSession.unitSeconds')}`
                      : `${ex.targetReps ?? 0} reps`}
                    {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 grid grid-cols-[40px_1fr_1fr] gap-2 text-xs font-medium uppercase rogym-sx-5e5c39ab">
                  <span>Set</span>
                  <span>{isCardio ? t('workout.createSession.unitSeconds') : 'Reps'}</span>
                  <span>Kg</span>
                </div>
                <div className="space-y-2">
                  {exerciseSets.map((s, setIdx) => (
                    <div
                      key={setIdx}
                      className="grid grid-cols-[40px_1fr_1fr] items-center gap-2"
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
                        placeholder={isCardio ? t('workout.createSession.unitSeconds') : 'reps'}
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
          {t('workout.createSession.setsCompleted', { done: completedCount, total: totalSets })}
        </p>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          disabled={!canFinish || submitting}
          onClick={onFinish}
        >
          {submitting ? t('workout.createSession.buttonSaving') : t('workout.createSession.buttonFinish')}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CreateWorkoutSessionPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined
  const sessionPanelRef = useRef<HTMLDivElement | null>(null)

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
      setError(t('workout.createSession.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [memberId, t])

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

    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        sessionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
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
      if (field === 'actualReps' && setIdx === 0 && typeof value === 'string') {
        next[exIdx] = next[exIdx].map((s) => ({ ...s, actualReps: value }))
        return next
      }
      if (field === 'actualWeightKg' && setIdx === 0 && typeof value === 'string') {
        next[exIdx] = next[exIdx].map((s) => ({ ...s, actualWeightKg: value }))
        return next
      }
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
        completed: true,
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
      setSubmitError(t('workout.createSession.errorSave'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.createSession.eyebrow')}
        title={t('workout.createSession.title')}
        description={t('workout.createSession.description')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Plan list */}
        <div className="space-y-4">
          {loading ? (
            <MemberSkeleton rows={5} />
          ) : error ? (
            <MemberErrorState message={error} onRetry={load} />
          ) : assignments.length === 0 ? (
            <MemberEmptyState
              title={t('workout.createSession.emptyTitle')}
              description={t('workout.createSession.emptyDescription')}
              action={
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary"
                  onClick={() => navigate('/member/workout/builder')}
                >
                  <Dumbbell size={14} /> {t('workout.createSession.buttonCreatePlan')}
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

        {/* Session or placeholder */}
        <div ref={sessionPanelRef} className="scroll-mt-4">
          {!selectedDay ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[20px] p-6 text-center rogym-sx-25952519">
              <Dumbbell size={36} className="rogym-sx-ed519d00" />
              <p className="text-sm font-medium text-white">
                {t('workout.createSession.placeholderTitle')}
              </p>
              <p className="text-xs rogym-sx-5e5c39ab">
                {t('workout.createSession.placeholderHint')}
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
