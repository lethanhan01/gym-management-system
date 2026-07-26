import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExerciseTargetFields } from '@/components/workout/PlanBuilderUI'
import { Modal } from '@/components/ui/Modal'
import type { WorkoutPlanDay } from '@/services/workout.service'
import { makeSessionDayTargets } from './sessionTargets'
import type { SessionDayTargets, SessionExerciseTargets } from './types'

export function SessionConfigModal({
  day,
  initialTargets,
  onClose,
  onSave,
}: {
  day: WorkoutPlanDay
  initialTargets?: SessionDayTargets
  onClose: () => void
  onSave: (targets: SessionDayTargets) => void
}) {
  const { t } = useTranslation('member')
  const [targets, setTargets] = useState(() => makeSessionDayTargets(day, initialTargets))
  const exercises = day.exercises ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []

  function updateTargets(
    planExerciseId: string,
    field: keyof SessionExerciseTargets,
    value: number | string,
  ) {
    setTargets((previous) => ({
      ...previous,
      [planExerciseId]: { ...previous[planExerciseId], [field]: value },
    }))
  }

  return (
    <Modal
      open
      size="xl"
      title={t('workout.createSession.editModalTitle', { name: day.name })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onClose}>
            {t('workout.createSession.buttonCancelEdit')}
          </button>
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={() => onSave(targets)}>
            {t('workout.createSession.buttonSaveEdit')}
          </button>
        </>
      }
    >
      <p className="mb-5 text-sm rogym-sx-d88f932f">{t('workout.createSession.editModalDescription')}</p>
      <div className="space-y-5">
        {exercises.map((exercise) => {
          const currentTargets = targets[exercise.planExerciseId]
          const isCardio = exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
          if (!currentTargets) return null

          return (
            <section key={exercise.planExerciseId} className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-4 text-sm font-semibold text-white">
                {exercise.exercise?.name ?? t('workout.session.defaultExerciseName')}
              </h3>
              <ExerciseTargetFields
                isCardio={isCardio}
                gridClassName="grid gap-3 md:grid-cols-3"
                compact
                restOutsideGrid
                weightPlaceholder="0"
                values={{
                  sets: currentTargets.targetSets,
                  reps: currentTargets.targetReps ?? 1,
                  duration: currentTargets.targetDurationSec ?? 1,
                  weight: currentTargets.targetWeightKg,
                  restSeconds: currentTargets.restSeconds,
                }}
                onChange={{
                  sets: (value) => updateTargets(exercise.planExerciseId, 'targetSets', value),
                  reps: (value) => updateTargets(exercise.planExerciseId, 'targetReps', value),
                  duration: (value) => updateTargets(exercise.planExerciseId, 'targetDurationSec', value),
                  weight: (value) => updateTargets(exercise.planExerciseId, 'targetWeightKg', value),
                  restSeconds: (value) => updateTargets(exercise.planExerciseId, 'restSeconds', value),
                }}
              />
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
