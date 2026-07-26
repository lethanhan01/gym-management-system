import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import {
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

export default function WorkoutSessionPage() {
  const { t } = useTranslation('member')
  const { id: planDayId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined
  const requestedAssignmentId = searchParams.get('assignmentId')

  const [assignment, setAssignment] = useState<WorkoutAssignmentSummary | null>(null)
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [day, setDay] = useState<WorkoutPlanDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // sets[exerciseIdx][setIdx]
  const [sets, setSets] = useState<SetState[][]>([])

  const load = useCallback(async () => {
    if (!memberId || !planDayId) return
    setLoading(true)
    setError(null)
    try {
      const assignments = await workoutService.getAssignments(memberId, {
        status: 'active',
        limit: requestedAssignmentId ? 10 : 1,
      })
      if (!assignments.length) {
        setError(t('workout.session.noActivePlan'))
        return
      }
      const active = requestedAssignmentId
        ? assignments.find((item) => item.assignmentId === requestedAssignmentId)
        : assignments[0]
      if (!active) {
        setError(t('workout.session.planNotActive'))
        return
      }
      setAssignment(active)
      const fullPlan = await workoutService.getPlan(active.planId)
      setPlan(fullPlan)
      const found = fullPlan.days?.find((d) => d.planDayId === planDayId) ?? null
      setDay(found)
      if (found?.exercises) {
        setSets(
          [...found.exercises]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(makeDefaultSets)
        )
      }
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status !== 403)
        setError(t('workout.session.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [memberId, planDayId, requestedAssignmentId, t])

  useEffect(() => {
    void load()
  }, [load])

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

  const anyCompleted = sets.some((exSets) => exSets.some((s) => s.completed))

  async function handleFinish() {
    if (!assignment || !day) return
    setSubmitting(true)
    setSubmitError(null)
    const exercises = day.exercises
      ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
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
        assignmentId: Number(assignment.assignmentId),
        planDayId: Number(planDayId),
        loggedAt: new Date().toISOString(),
        sets: logSets,
      })
      setDone(true)
    } catch {
      setSubmitError(t('workout.session.errorSave'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <MemberPage>
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 py-12 text-center">
          <CheckCircle2 size={56} className="rogym-sx-b2fbf853" />
          <h2 className="text-2xl font-bold text-white">{t('workout.session.completedTitle')}</h2>
          <p className="text-sm rogym-sx-d88f932f" >
            {t('workout.session.completedDesc')}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/member/workout/plan')}
            >
              {t('workout.session.buttonGoToPlan')}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => navigate('/member/workout/history')}
            >
              {t('workout.session.buttonViewHistory')}
            </button>
          </div>
        </div>
      </MemberPage>
    )
  }

  const sortedExercises = day?.exercises
    ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
    : []

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={plan?.name ?? t('workout.session.defaultPlanName')}
        title={day ? `${day.name}` : t('workout.session.defaultDayName')}
        description={
          day
            ? t('workout.session.descriptionDay', { day: day.dayNumber, count: sortedExercises.length })
            : t('workout.session.descriptionDefault')
        }
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => navigate('/member/workout/plan')}
          >
            <ArrowLeft size={15} /> {t('workout.session.buttonGoBack')}
          </button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={5} />
      ) : error ? (
        <MemberErrorState message={error} onRetry={load} />
      ) : !day ? (
        <MemberErrorState message={t('workout.session.errorNotFound')} />
      ) : (
        <div className="space-y-4 pb-28">
          {sortedExercises.map((ex, exIdx) => {
            const isCardio = ex.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
            return (
              <div
                key={ex.planExerciseId}
                className="rogym-sx-46079668"
              >
                {/* Exercise header */}
                <div className="flex items-center gap-3 px-4 py-3 rogym-sx-dd0d9e7c" >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold rogym-sx-252b3c13"
                    
                  >
                    {exIdx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{ex.exercise?.name ?? t('workout.session.defaultExerciseName')}</p>
                    <p className="text-xs rogym-sx-5e5c39ab" >
                      Target: {ex.targetSets} sets ·{' '}
                      {isCardio
                        ? `${ex.targetDurationSec ?? 0} giây`
                        : `${ex.targetReps ?? 0} reps`}
                      {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                    </p>
                  </div>
                </div>

                {/* Sets */}
                <div className="p-4">
                  {/* Column headers */}
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
                        <span className="rogym-workout-set-index text-sm font-medium">
                          {setIdx + 1}
                        </span>
                        <input
                          type="number"
                          className="rogym-input py-1.5 text-sm"
                          min={0}
                          value={isCardio ? s.actualDurationSec : s.actualReps}
                          onChange={(e) =>
                            updateSet(
                              exIdx,
                              setIdx,
                              isCardio ? 'actualDurationSec' : 'actualReps',
                              e.target.value
                            )
                          }
                          placeholder={isCardio ? t('workout.session.unitSeconds') : 'reps'}
                        />
                        <input
                          type="number"
                          className="rogym-input py-1.5 text-sm"
                          min={0}
                          step={0.25}
                          value={s.actualWeightKg}
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, 'actualWeightKg', e.target.value)
                          }
                          placeholder="kg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSet(exIdx, setIdx, 'completed', !s.completed)
                          }
                          className="rogym-workout-set-toggle"
                        >
                          {s.completed ? (
                            <CheckCircle2 size={22} />
                          ) : (
                            <Circle size={22} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {submitError && <MemberErrorState message={submitError} />}
        </div>
      )}

      {/* Floating finish bar */}
      {!loading && !error && day && (
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-6 py-4 rogym-sx-e122cbce"
          
        >
          <p className="text-sm rogym-sx-d88f932f" >
            {t('workout.session.setsCompleted', {
              done: sets.flat().filter((s) => s.completed).length,
              total: sets.flat().length,
            })}
          </p>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary px-6"
            disabled={!anyCompleted || submitting}
            onClick={() => void handleFinish()}
          >
            {submitting ? t('workout.session.buttonSaving') : t('workout.session.buttonFinish')}
          </button>
        </div>
      )}
    </MemberPage>
  )
}
