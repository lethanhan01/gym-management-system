import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock } from 'lucide-react'
import type { WorkoutPlanDay } from '@/services/workout.service'
import type { SetState, UpdateSet } from './types'

function RestBreak({ seconds }: { seconds: number }) {
  const { t } = useTranslation('member')
  const label = t('workout.createSession.restBreak', { seconds })

  return (
    <div className="my-3 rounded-lg bg-white/[0.04] px-3 py-2" aria-label={label}>
      <div className="mb-1.5 flex items-center justify-between text-xs rogym-sx-5e5c39ab">
        <span>{label}</span>
        <Clock size={13} aria-hidden="true" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={label}>
        <div className="h-full w-2/3 rounded-full bg-[var(--rogym-primary)] animate-pulse" />
      </div>
    </div>
  )
}

export function SessionView({
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
  onUpdateSet: UpdateSet
  onFinish: () => void
  submitting: boolean
  submitError: string | null
  done: boolean
}) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const sortedExercises = day.exercises ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []
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
    <div className="overflow-hidden rounded-[20px] rogym-sx-25952519">
      <div className="px-5 pb-3 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest rogym-sx-b2fbf853">{day.name}</p>
        <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
          {sortedExercises.length} {t('workout.createSession.unitExercises')}
        </p>
      </div>

      <div className="space-y-3 px-5 pb-4">
        {sortedExercises.map((exercise, exerciseIndex) => {
          const isCardio = exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
          const exerciseSets = sets[exerciseIndex] ?? []
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
                    {exercise.targetSets} sets ·{' '}
                    {isCardio
                      ? `${exercise.targetDurationSec ?? 0} ${t('workout.createSession.unitSeconds')}`
                      : `${exercise.targetReps ?? 0} reps`}
                    {exercise.targetWeightKg ? ` · ${Number(exercise.targetWeightKg)} kg` : ''}
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
                  {exerciseSets.map((set, setIndex) => {
                    const hasFollowingSet = setIndex < exerciseSets.length - 1
                    const hasFollowingExercise = exerciseIndex < sortedExercises.length - 1

                    return (
                      <Fragment key={setIndex}>
                        <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-2">
                          <span className="rogym-workout-set-index text-sm font-medium">{setIndex + 1}</span>
                          <input
                            type="number"
                            className="rogym-input py-1.5 text-sm"
                            min={0}
                            value={isCardio ? set.actualDurationSec : set.actualReps}
                            onChange={(event) =>
                              onUpdateSet(
                                exerciseIndex,
                                setIndex,
                                isCardio ? 'actualDurationSec' : 'actualReps',
                                event.target.value,
                              )
                            }
                            placeholder={isCardio ? t('workout.createSession.unitSeconds') : 'reps'}
                          />
                          <input
                            type="number"
                            className="rogym-input py-1.5 text-sm"
                            min={0}
                            step={0.25}
                            value={set.actualWeightKg}
                            onChange={(event) =>
                              onUpdateSet(exerciseIndex, setIndex, 'actualWeightKg', event.target.value)
                            }
                            placeholder="kg"
                          />
                        </div>
                        {(hasFollowingSet || hasFollowingExercise) && (
                          <RestBreak seconds={exercise.restSeconds ?? 60} />
                        )}
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
