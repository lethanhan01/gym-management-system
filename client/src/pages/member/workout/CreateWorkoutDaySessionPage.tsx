import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { MemberErrorState, MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import { getApiError } from '@/lib/api-error'
import workoutService, { type WorkoutAssignmentSummary, type WorkoutPlanDay } from '@/services/workout.service'
import { trainingService } from '@/services/training.service'
import { useAuthStore } from '@/stores/authStore'
import { clearSessionDraft, loadSessionDraft } from './create-session/sessionDraft'
import { makeSessionDayConfig } from './create-session/sessionTargets'
import type { SessionDayConfig } from './create-session/types'

type LoadedSession = {
  assignment: WorkoutAssignmentSummary
  day: WorkoutPlanDay
  planName: string
  config: SessionDayConfig
}

function isPositiveId(value: string | null | undefined) {
  return !!value && /^[1-9]\d*$/.test(value)
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function RestBreak({ seconds }: { seconds: number }) {
  const { t } = useTranslation('member')
  const label = t('workout.createSession.restBreak', { seconds })

  return (
    <div className="my-3 rounded-lg bg-white/[0.04] px-3 py-2" aria-label={label}>
      <div className="flex items-center justify-between text-xs rogym-sx-5e5c39ab">
        <span>{label}</span>
        <Clock size={13} aria-hidden="true" />
      </div>
    </div>
  )
}

export default function CreateWorkoutDaySessionPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const { planDayId } = useParams()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const memberId = user?.memberId ? String(user.memberId) : null
  const assignmentId = searchParams.get('assignmentId')
  const requestedSessionId = searchParams.get('sessionId')
  const sessionId = isPositiveId(requestedSessionId) ? requestedSessionId : null
  const queryIsValid = isPositiveId(planDayId) && isPositiveId(assignmentId)
    && (requestedSessionId === null || sessionId !== null)

  const [loaded, setLoaded] = useState<LoadedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!queryIsValid || !memberId || !assignmentId || !planDayId) {
      setError(t('workout.createSession.invalidDayLink'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const assignments = await workoutService.getAssignments(memberId)
      const assignment = assignments.find(
        (item) => item.assignmentId === assignmentId && item.status === 'active',
      )
      if (!assignment) {
        setError(t('workout.createSession.invalidDayLink'))
        return
      }

      if (sessionId) {
        const session = await trainingService.getSession(sessionId)
        if (session.assignmentId !== assignmentId || session.planDayId !== planDayId) {
          setError(t('workout.createSession.invalidDayLink'))
          return
        }
      }

      const plan = await workoutService.getPlan(assignment.planId)
      const day = plan.days?.find((item) => item.planDayId === planDayId)
      if (!day) {
        setError(t('workout.createSession.invalidDayLink'))
        return
      }

      const draft = loadSessionDraft(memberId, day, assignment, sessionId)
      setLoaded({
        assignment,
        day,
        planName: plan.name,
        config: makeSessionDayConfig(day, draft),
      })
    } catch (caught) {
      setError(getApiError(caught, t('workout.createSession.errorLoad')))
    } finally {
      setLoading(false)
    }
  }, [assignmentId, memberId, planDayId, queryIsValid, sessionId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function finishSession() {
    if (!loaded || !memberId) return

    const exercises = [...(loaded.day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
    const sets = exercises.flatMap((exercise) =>
      (loaded.config[exercise.planExerciseId]?.sets ?? []).map((set, index) => ({
        planExerciseId: Number(exercise.planExerciseId),
        setNumber: index + 1,
        actualReps: toOptionalNumber(set.actualReps),
        actualWeightKg: toOptionalNumber(set.actualWeightKg),
        actualDurationSec: toOptionalNumber(set.actualDurationSec),
        completed: true,
      })),
    )
    if (sets.length === 0) {
      setSubmitError(t('workout.createSession.emptyConfiguredSets'))
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await workoutService.createLog({
        assignmentId: Number(loaded.assignment.assignmentId),
        planDayId: Number(loaded.day.planDayId),
        loggedAt: new Date().toISOString(),
        sets,
      })
      clearSessionDraft(memberId, loaded.day, loaded.assignment, sessionId)
      setDone(true)
    } catch (caught) {
      setSubmitError(getApiError(caught, t('workout.createSession.errorSave')))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <MemberPage><MemberSkeleton rows={5} /></MemberPage>
  }

  if (error || !loaded) {
    return (
      <MemberPage>
        <MemberErrorState message={error ?? t('workout.createSession.invalidDayLink')} onRetry={load} />
        <button type="button" className="rogym-btn rogym-btn--outline-white mt-5" onClick={() => navigate('/member/workout/create-session')}>
          <ArrowLeft size={15} /> {t('workout.createSession.buttonBackToDays')}
        </button>
      </MemberPage>
    )
  }

  const exercises = [...(loaded.day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

  if (done) {
    return (
      <MemberPage>
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[20px] p-6 text-center rogym-sx-25952519">
          <CheckCircle2 size={48} className="rogym-sx-b2fbf853" />
          <h2 className="text-xl font-bold text-white">{t('workout.createSession.completedTitle')}</h2>
          <p className="text-sm rogym-sx-d88f932f">{t('workout.createSession.completedDesc')}</p>
          <div className="flex gap-3">
            <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={() => navigate('/member/workout/plan')}>
              {t('workout.createSession.buttonGoToPlan')}
            </button>
            <button type="button" className="rogym-btn rogym-btn--primary" onClick={() => navigate('/member/workout/history')}>
              {t('workout.createSession.buttonViewHistory')}
            </button>
          </div>
        </div>
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={loaded.planName}
        title={loaded.day.name}
        description={t('workout.session.descriptionDay', { day: loaded.day.dayNumber, count: exercises.length })}
      />
      <button type="button" className="rogym-btn rogym-btn--outline-white mb-5" onClick={() => navigate('/member/workout/create-session')}>
        <ArrowLeft size={15} /> {t('workout.createSession.buttonBackToDays')}
      </button>

      <div className="overflow-hidden rounded-[20px] rogym-sx-25952519">
        <div className="space-y-3 px-5 pb-4 pt-5">
          {exercises.map((exercise, exerciseIndex) => {
            const isCardio = exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
            const exerciseConfig = loaded.config[exercise.planExerciseId]
            const sets = exerciseConfig?.sets ?? []
            return (
              <div key={exercise.planExerciseId} className="rogym-sx-46079668">
                <div className="flex items-center gap-3 px-4 py-3 rogym-sx-dd0d9e7c">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">
                    {exerciseIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {exercise.exercise?.name ?? t('workout.session.defaultExerciseName')}
                    </p>
                    <p className="text-xs rogym-sx-5e5c39ab">
                      {t('workout.createSession.configuredSets', { count: sets.length })}
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
                    {sets.map((set, setIndex) => {
                      const hasFollowingSet = setIndex < sets.length - 1
                      const hasFollowingExercise = exerciseIndex < exercises.length - 1
                      return (
                        <Fragment key={setIndex}>
                          <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-2 rounded-lg bg-white/[0.03] p-2 text-sm">
                            <span className="rogym-workout-set-index font-medium">{setIndex + 1}</span>
                            <span className="text-white">{isCardio ? set.actualDurationSec : set.actualReps || '—'}</span>
                            <span className="text-white">{set.actualWeightKg || '—'}</span>
                          </div>
                          {(hasFollowingSet || hasFollowingExercise) && <RestBreak seconds={exerciseConfig?.restSeconds ?? 60} />}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {submitError && <p className="px-5 pb-2 text-center text-xs text-red-300">{submitError}</p>}

        <div className="rogym-sx-8553bf9e flex items-center justify-end gap-3 px-5 py-4">
          <button type="button" className="rogym-btn rogym-btn--primary" disabled={submitting} onClick={() => void finishSession()}>
            {submitting ? t('workout.createSession.buttonSaving') : t('workout.createSession.buttonFinish')}
          </button>
        </div>
      </div>
    </MemberPage>
  )
}
