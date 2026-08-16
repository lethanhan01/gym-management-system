import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { Button, FormField, Input, Modal } from '@/components/ui'
import type { WorkoutPlanDay } from '@/services/workout.service'
import { makeSessionDayConfig, makeSessionSetConfig } from './sessionTargets'
import type { SessionDayConfig, SessionSetConfig } from './types'

export function SessionConfigModal({
  day,
  initialConfig,
  onClose,
  onSave,
}: {
  day: WorkoutPlanDay
  initialConfig?: SessionDayConfig
  onClose: () => void
  onSave: (config: SessionDayConfig) => void
}) {
  const { t } = useTranslation('member')
  const [config, setConfig] = useState(() => makeSessionDayConfig(day, initialConfig))
  const exercises = day.exercises ? [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []

  function updateSet(
    planExerciseId: string,
    setIndex: number,
    field: keyof SessionSetConfig,
    value: string,
  ) {
    setConfig((previous) => ({
      ...previous,
      [planExerciseId]: {
        ...previous[planExerciseId],
        sets: previous[planExerciseId].sets.map((set, index) =>
          index === setIndex ? { ...set, [field]: value } : set,
        ),
      },
    }))
  }

  function updateRest(planExerciseId: string, value: string) {
    setConfig((previous) => ({
      ...previous,
      [planExerciseId]: { ...previous[planExerciseId], restSeconds: Number(value) },
    }))
  }

  function addSet(planExerciseId: string, fallback: SessionSetConfig) {
    setConfig((previous) => {
      const exerciseConfig = previous[planExerciseId]
      const source = exerciseConfig.sets[exerciseConfig.sets.length - 1] ?? fallback
      return {
        ...previous,
        [planExerciseId]: { ...exerciseConfig, sets: [...exerciseConfig.sets, { ...source }] },
      }
    })
  }

  function removeSet(planExerciseId: string, setIndex: number) {
    setConfig((previous) => {
      const exerciseConfig = previous[planExerciseId]
      if (exerciseConfig.sets.length <= 1) return previous
      return {
        ...previous,
        [planExerciseId]: {
          ...exerciseConfig,
          sets: exerciseConfig.sets.filter((_, index) => index !== setIndex),
        },
      }
    })
  }

  return (
    <Modal
      open
      size="xl"
      title={t('workout.createSession.editModalTitle', { name: day.name })}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline-white" onClick={onClose}>
            {t('workout.createSession.buttonCancelEdit')}
          </Button>
          <Button variant="primary" onClick={() => onSave(config)}>
            {t('workout.createSession.buttonSaveEdit')}
          </Button>
        </>
      }
    >
      <p className="mb-5 text-sm rogym-sx-d88f932f">{t('workout.createSession.editModalDescription')}</p>
      <div className="space-y-5">
        {exercises.map((exercise) => {
          const currentConfig = config[exercise.planExerciseId]
          const isCardio = exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
          if (!currentConfig) return null

          return (
            <section key={exercise.planExerciseId} className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-4 text-sm font-semibold text-white">
                {exercise.exercise?.name ?? t('workout.session.defaultExerciseName')}
              </h3>
              <div className="space-y-3">
                {currentConfig.sets.map((set, setIndex) => (
                  <div key={setIndex} className="rounded-lg border border-white/5 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">
                        {t('workout.createSession.setLabel', { number: setIndex + 1 })}
                      </p>
                      <Button
                        variant="icon"
                        size="sm"
                        disabled={currentConfig.sets.length <= 1}
                        onClick={() => removeSet(exercise.planExerciseId, setIndex)}
                        aria-label={t('workout.createSession.buttonRemoveSet', { number: setIndex + 1 })}
                        leftIcon={<Minus size={14} />}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField
                        label={isCardio ? t('workout.createSession.fieldDuration') : t('workout.createSession.fieldReps')}
                        htmlFor={`set-${exercise.planExerciseId}-${setIndex}-reps`}
                      >
                        <Input
                          id={`set-${exercise.planExerciseId}-${setIndex}-reps`}
                          aria-label={isCardio ? t('workout.createSession.fieldDuration') : t('workout.createSession.fieldReps')}
                          type="number"
                          min={0}
                          required
                          value={isCardio ? set.actualDurationSec : set.actualReps}
                          onChange={(event) => updateSet(
                            exercise.planExerciseId,
                            setIndex,
                            isCardio ? 'actualDurationSec' : 'actualReps',
                            event.target.value,
                          )}
                        />
                      </FormField>
                      <FormField
                        label={t('workout.createSession.fieldWeight')}
                        htmlFor={`set-${exercise.planExerciseId}-${setIndex}-weight`}
                      >
                        <Input
                          id={`set-${exercise.planExerciseId}-${setIndex}-weight`}
                          aria-label={t('workout.createSession.fieldWeight')}
                          type="number"
                          min={0}
                          step={0.25}
                          placeholder="0"
                          value={set.actualWeightKg}
                          onChange={(event) => updateSet(exercise.planExerciseId, setIndex, 'actualWeightKg', event.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline-white"
                  size="sm"
                  onClick={() => addSet(exercise.planExerciseId, makeSessionSetConfig(exercise))}
                  leftIcon={<Plus size={14} />}
                >
                  {t('workout.createSession.buttonAddSet')}
                </Button>
                <FormField
                  label={t('workout.createSession.fieldRestSeconds')}
                  htmlFor={`exercise-${exercise.planExerciseId}-rest`}
                >
                  <Input
                    id={`exercise-${exercise.planExerciseId}-rest`}
                    aria-label={t('workout.createSession.fieldRestSeconds')}
                    type="number"
                    min={0}
                    required
                    value={String(currentConfig.restSeconds)}
                    onChange={(event) => updateRest(exercise.planExerciseId, event.target.value)}
                  />
                </FormField>
              </div>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
