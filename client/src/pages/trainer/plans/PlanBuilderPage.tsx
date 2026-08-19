import { FormEvent, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { Archive, ArrowLeft, Lock, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'
import { getApiError, getApiErrorCode, isApiConflict } from '@/lib/api-error'
import workoutService, {
  type Exercise,
  type WorkoutPlan,
  type WorkoutPlanDay,
  type WorkoutPlanExercise,
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
import { ExerciseTargetFields, NumberField } from '@/components/workout/PlanBuilderUI'

type DeleteTarget =
  | { type: 'day'; day: WorkoutPlanDay }
  | { type: 'exercise'; day: WorkoutPlanDay; exercise: WorkoutPlanExercise }
  | null

export default function TrainerPlanBuilderPage() {
  const { t } = useTranslation('trainer')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [writeBlocked, setWriteBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkoutPlanDay | null>(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayNumber, setDayNumber] = useState(1)
  const [dayName, setDayName] = useState('')
  const [dayNotes, setDayNotes] = useState('')
  const [exerciseDay, setExerciseDay] = useState<WorkoutPlanDay | null>(null)
  const [exerciseId, setExerciseId] = useState('')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [targetDuration, setTargetDuration] = useState(60)
  const [targetWeight, setTargetWeight] = useState('')
  const [restSeconds, setRestSeconds] = useState(60)
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [editingPlanExercise, setEditingPlanExercise] = useState<{
    day: WorkoutPlanDay
    exercise: WorkoutPlanExercise
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  // DAY_LABELS moved inside component so t() runs in React context
  const DAY_LABELS = [
    '',
    t('plans.builder.dayLabels.mon'),
    t('plans.builder.dayLabels.tue'),
    t('plans.builder.dayLabels.wed'),
    t('plans.builder.dayLabels.thu'),
    t('plans.builder.dayLabels.fri'),
    t('plans.builder.dayLabels.sat'),
    t('plans.builder.dayLabels.sun'),
  ]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [planData, exerciseData] = await Promise.all([
        workoutService.getPlan(id),
        workoutService.getExercises({ pageSize: 100 }),
      ])
      setPlan(planData)
      if (planData.status === 'archived') setWriteBlocked(true)
      setExercises(exerciseData.data)
    } catch (err) {
      setError(getApiError(err, t('plans.builder.error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.exerciseId === exerciseId) ?? null,
    [exerciseId, exercises]
  )
  const readonly = writeBlocked || plan?.status === 'archived'
  const exerciseCount = useMemo(
    () => plan?.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0,
    [plan?.days]
  )
  const groupedWeeks = useMemo(() => {
    const groups = new Map<number, WorkoutPlanDay[]>()
    for (const day of plan?.days ?? []) {
      const weekDays = groups.get(day.weekNumber) ?? []
      weekDays.push(day)
      groups.set(day.weekNumber, weekDays)
    }
    return [...groups.entries()]
      .sort(([weekA], [weekB]) => weekA - weekB)
      .map(([week, days]) => ({
        week,
        days: days.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      }))
  }, [plan?.days])

  function handleMutationError(err: unknown, fallback: string, retryAction?: () => void) {
    const message = getApiError(err, fallback)
    if (
      getApiErrorCode(err) === 'PLAN_WRITE_BLOCKED' ||
      (isApiConflict(err) && message.toLocaleLowerCase('vi').includes('workout log'))
    ) {
      setWriteBlocked(true)
      toast.error(t('plans.builder.error.readonly'))
      return
    }
    
    if (retryAction) {
      toast.error(message, {
        action: {
          label: t('button.retry', { defaultValue: 'Thử lại' }),
          onClick: retryAction,
        },
      })
    } else {
      toast.error(message)
    }
  }

  async function saveMetadata(name: string, description: string) {
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      await load()
    } catch (err) {
      handleMutationError(err, t('plans.builder.error.saveMetaFailed'), () => saveMetadata(name, description))
    } finally {
      setSubmitting(false)
    }
  }

  function openCreateDay() {
    const numbers = plan?.days?.map((day) => day.dayNumber) ?? []
    const nextDayNumber = numbers.length ? Math.max(...numbers) + 1 : 1
    setEditingDay(null)
    setWeekNumber(Math.floor((nextDayNumber - 1) / 7) + 1)
    setDayOfWeek(((nextDayNumber - 1) % 7) + 1)
    setDayNumber(nextDayNumber)
    setDayName('')
    setDayNotes('')
    setDayOpen(true)
  }

  const openEditDay = useCallback((day: WorkoutPlanDay) => {
    setEditingDay(day)
    setWeekNumber(day.weekNumber)
    setDayOfWeek(day.dayOfWeek)
    setDayNumber(day.dayNumber)
    setDayName(day.name)
    setDayNotes(day.notes ?? '')
    setDayOpen(true)
  }, [])

  async function saveDay(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload = {
      weekNumber,
      dayOfWeek,
      dayNumber,
      name: dayName.trim(),
      notes: dayNotes.trim() || undefined,
    }
    try {
      if (editingDay) await workoutService.updatePlanDay(id, editingDay.planDayId, payload)
      else await workoutService.addPlanDay(id, payload)
      setDayOpen(false)
      await load()
    } catch (err) {
      handleMutationError(err, t('plans.builder.error.saveDayFailed'), () => saveDay(event))
    } finally {
      setSubmitting(false)
    }
  }

  const openAddExercise = useCallback((day: WorkoutPlanDay) => {
    setExerciseDay(day)
    setExerciseId('')
    setTargetSets(3)
    setTargetReps(10)
    setTargetDuration(60)
    setTargetWeight('')
    setRestSeconds(60)
    setExerciseNotes('')
  }, [])

  const openEditExercise = useCallback((day: WorkoutPlanDay, exercise: WorkoutPlanExercise) => {
    setEditingPlanExercise({ day, exercise })
    setTargetSets(exercise.targetSets)
    setTargetReps(exercise.targetReps ?? 1)
    setTargetDuration(exercise.targetDurationSec ?? 60)
    setTargetWeight(exercise.targetWeightKg ?? '')
    setRestSeconds(exercise.restSeconds ?? 60)
    setExerciseNotes(exercise.notes ?? '')
  }, [])

  const requestDeleteDay = useCallback(
    (day: WorkoutPlanDay) => setDeleteTarget({ type: 'day', day }),
    []
  )
  const requestDeleteExercise = useCallback(
    (day: WorkoutPlanDay, exercise: WorkoutPlanExercise) =>
      setDeleteTarget({ type: 'exercise', day, exercise }),
    []
  )

  async function addExercise(event: FormEvent) {
    event.preventDefault()
    if (!exerciseDay || !selectedExercise) return
    setSubmitting(true)
    setError(null)
    const nextIndex = exerciseDay.exercises?.length
      ? Math.max(...exerciseDay.exercises.map((item) => item.orderIndex)) + 1
      : 0
    try {
      await workoutService.addPlanExercise(id, exerciseDay.planDayId, {
        exerciseId: Number(selectedExercise.exerciseId),
        orderIndex: nextIndex,
        targetSets,
        targetReps: selectedExercise.bodyPart?.name?.toLowerCase() === 'cardio' ? undefined : targetReps,
        targetDurationSec: targetDuration,
        targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
        restSeconds,
        notes: exerciseNotes.trim() || undefined,
      })
      setExerciseDay(null)
      await load()
    } catch (err) {
      handleMutationError(err, t('plans.builder.error.addExerciseFailed'), () => addExercise(event))
    } finally {
      setSubmitting(false)
    }
  }

  async function updateExerciseTarget(event: FormEvent) {
    event.preventDefault()
    if (!editingPlanExercise) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlanExercise(
        id,
        editingPlanExercise.day.planDayId,
        editingPlanExercise.exercise.planExerciseId,
        {
          targetSets,
          targetReps:
            editingPlanExercise.exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio' ? undefined : targetReps,
          targetDurationSec: targetDuration,
          targetWeightKg: targetWeight ? Number(targetWeight) : 0,
          restSeconds,
          notes: exerciseNotes.trim() || '',
        }
      )
      setEditingPlanExercise(null)
      await load()
    } catch (err) {
      handleMutationError(err, t('plans.builder.error.updateExerciseFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    setError(null)
    try {
      if (deleteTarget.type === 'day') {
        await workoutService.deletePlanDay(id, deleteTarget.day.planDayId)
      } else {
        await workoutService.deletePlanExercise(
          id,
          deleteTarget.day.planDayId,
          deleteTarget.exercise.planExerciseId
        )
      }
      setDeleteTarget(null)
      await load()
    } catch (err) {
      handleMutationError(err, t('plans.builder.error.deleteFailed'), confirmDelete)
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(status: 'active' | 'archived') {
    if (status === 'active') {
      if (!plan?.days?.length || exerciseCount === 0) {
        toast.error(t('plans.builder.error.activateEmpty'))
        return
      }
      
      const emptyDay = plan.days.find((day) => !day.exercises?.length)
      if (emptyDay) {
        toast.error(t('plans.builder.error.activateEmptyDay', { day: emptyDay.name }))
        return
      }

      const hasIncompleteExercise = plan.days.some((day) =>
        day.exercises?.some(
          (exercise) =>
            (exercise.targetReps == null && exercise.targetDurationSec == null) ||
            exercise.restSeconds == null
        )
      )
      if (hasIncompleteExercise) {
        toast.error(t('plans.builder.error.activateIncompleteExercise'))
        return
      }
    }
    
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(id, { status })
      await load()
    } catch (err) {
      handleMutationError(
        err,
        status === 'active'
          ? t('plans.builder.error.activateFailed')
          : t('plans.builder.error.archiveFailed'),
        () => changeStatus(status)
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={7} />
      </TrainerPage>
    )
  if (error && !plan)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!plan) return null

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('plans.builder.eyebrow')}
        title={plan.name}
        description={
          readonly
            ? t('plans.builder.descriptionReadonly')
            : t('plans.builder.descriptionEdit')
        }
        actions={
          <>
            <Button
              variant="outline-white"
              onClick={() => navigate('/trainer/plans')}
            >
              <ArrowLeft size={16} /> {t('plans.builder.backToList')}
            </Button>
            {plan.status === 'draft' && !readonly && (
              <Button
                variant="primary"
                disabled={submitting}
                onClick={() => changeStatus('active')}
              >
                <Zap size={16} /> {t('plans.builder.activate')}
              </Button>
            )}
            {plan.status !== 'archived' && !readonly && (
              <Button
                variant="outline-white"
                disabled={submitting}
                onClick={() => changeStatus('archived')}
              >
                <Archive size={16} /> {t('plans.builder.archive')}
              </Button>
            )}
          </>
        }
      />
      <div className="flex items-center gap-3">
        <TrainerStatusBadge status={plan.status} />
        <span className="text-sm rogym-text-dim">
          {t('plans.builder.weekSummary', {
            weeks: groupedWeeks.length,
            days: plan.days?.length ?? 0,
            exercises: exerciseCount,
          })}
        </span>
      </div>
      {readonly && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Lock size={18} /> {t('plans.builder.readonlyBanner')}
        </div>
      )}
      <PlanMetadataForm
        name={plan.name}
        description={plan.description ?? ''}
        readonly={readonly}
        submitting={submitting}
        onSave={saveMetadata}
      />

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{t('plans.builder.structureTitle')}</h2>
        {!readonly && (
          <Button variant="primary" onClick={openCreateDay}>
            <Plus size={16} /> {t('plans.builder.addDay')}
          </Button>
        )}
      </div>
      {!plan.days?.length ? (
        <TrainerEmptyState
          title={t('plans.builder.noDay')}
          description={t('plans.builder.noDayDesc')}
          action={
            !readonly ? (
              <Button
                variant="primary"
                onClick={openCreateDay}
              >
                {t('plans.builder.addFirstDay')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          {groupedWeeks.map(({ week, days }) => (
            <div key={week} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] font-bold rogym-text-accent">
                  {week}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {t('plans.builder.weekLabel', { number: week })}
                  </h2>
                  <p className="text-xs rogym-text-dim">
                    {t('plans.builder.dayScheduled', { count: days.length })}
                  </p>
                </div>
              </div>
              {days.map((day) => (
                <PlanDayCard
                  key={day.planDayId}
                  day={day}
                  dayLabels={DAY_LABELS}
                  readonly={readonly}
                  onEditDay={openEditDay}
                  onDeleteDay={requestDeleteDay}
                  onAddExercise={openAddExercise}
                  onEditExercise={openEditExercise}
                  onDeleteExercise={requestDeleteExercise}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Day create/edit modal */}
      <TrainerModal
        open={dayOpen}
        title={editingDay ? t('plans.builder.dayModal.editTitle') : t('plans.builder.dayModal.createTitle')}
        onClose={() => setDayOpen(false)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setDayOpen(false)}
            >
              {t('plans.builder.dayModal.cancel')}
            </Button>
            <SubmitButton form="plan-day-form" loading={submitting} disabled={!dayName.trim()}>
              {t('plans.builder.dayModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="plan-day-form" className="space-y-4" onSubmit={saveDay}>
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label={t('plans.builder.dayModal.fieldWeek')} min={1} value={weekNumber} onChange={setWeekNumber} />
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('plans.builder.dayModal.fieldDayOfWeek')}</span>
              <TrainerSelect
                value={String(dayOfWeek)}
                onValueChange={(value) => setDayOfWeek(Number(value))}
              >
                {DAY_LABELS.slice(1).map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </TrainerSelect>
            </label>
            <NumberField label={t('plans.builder.dayModal.fieldDayNumber')} min={1} value={dayNumber} onChange={setDayNumber} />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.builder.dayModal.fieldName')}</span>
            <input
              className="rogym-input"
              value={dayName}
              onChange={(event) => setDayName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.builder.dayModal.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={dayNotes}
              onChange={(event) => setDayNotes(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      {/* Add exercise to day modal */}
      <TrainerModal
        open={Boolean(exerciseDay)}
        title={t('plans.builder.exerciseModal.title', { dayName: exerciseDay?.name ?? '' })}
        onClose={() => setExerciseDay(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setExerciseDay(null)}
            >
              {t('plans.builder.exerciseModal.cancel')}
            </Button>
            <SubmitButton
              form="plan-exercise-form"
              loading={submitting}
              disabled={!exerciseId || targetSets < 1}
            >
              {t('plans.builder.exerciseModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="plan-exercise-form" className="space-y-4" onSubmit={addExercise}>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.builder.exerciseModal.fieldExercise')}</span>
            <TrainerSelect value={exerciseId} onValueChange={setExerciseId} required>
              <option value="">{t('plans.builder.exerciseModal.selectFromLib')}</option>
              {exercises.map((exercise) => (
                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                  {exercise.name} - {exercise.targetMuscle?.name ?? '—'}
                </option>
              ))}
            </TrainerSelect>
          </label>
          {selectedExercise && (
            <div className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4">
              {selectedExercise.gifUrl && (
                <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-white p-1.5 flex items-center justify-center">
                  <img
                    src={selectedExercise.gifUrl}
                    alt={t('plans.builder.exerciseModal.illustrationAlt', { name: selectedExercise.name })}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="text-sm rogym-text-secondary">
                <div className="font-semibold text-white">{selectedExercise.name}</div>
                <div className="mt-1">
                  {selectedExercise.targetMuscle?.name ?? t('plans.builder.dayCard.bodyPart')} ·{' '}
                  {selectedExercise.equipment?.name ?? t('plans.builder.dayCard.noEquipment')}
                </div>
                <p className="mt-2 line-clamp-3">{selectedExercise.description}</p>
              </div>
            </div>
          )}
          <ExerciseTargetFields
            isCardio={selectedExercise?.bodyPart?.name?.toLowerCase() === 'cardio'}
            durationMode="always"
            values={{
              sets: targetSets,
              reps: targetReps,
              duration: targetDuration,
              weight: targetWeight,
              restSeconds,
            }}
            onChange={{
              sets: setTargetSets,
              reps: setTargetReps,
              duration: setTargetDuration,
              weight: setTargetWeight,
              restSeconds: setRestSeconds,
            }}
          />
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.builder.exerciseModal.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={exerciseNotes}
              onChange={(event) => setExerciseNotes(event.target.value)}
            />
          </label>
          <p className="text-xs rogym-text-dim">
            {t('plans.builder.exerciseModal.hint')}
          </p>
        </form>
      </TrainerModal>

      {/* Edit exercise target modal */}
      <TrainerModal
        open={Boolean(editingPlanExercise)}
        title={t('plans.builder.editExerciseModal.title', {
          name: editingPlanExercise?.exercise.exercise?.name ?? t('plans.builder.editExerciseModal.defaultName'),
        })}
        onClose={() => setEditingPlanExercise(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setEditingPlanExercise(null)}
            >
              {t('plans.builder.editExerciseModal.cancel')}
            </Button>
            <SubmitButton form="edit-plan-exercise-form" loading={submitting}>
              {t('plans.builder.editExerciseModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="edit-plan-exercise-form" className="space-y-4" onSubmit={updateExerciseTarget}>
          <ExerciseTargetFields
            isCardio={editingPlanExercise?.exercise.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'}
            durationMode="always"
            values={{
              sets: targetSets,
              reps: targetReps,
              duration: targetDuration,
              weight: targetWeight,
              restSeconds,
            }}
            onChange={{
              sets: setTargetSets,
              reps: setTargetReps,
              duration: setTargetDuration,
              weight: setTargetWeight,
              restSeconds: setRestSeconds,
            }}
          />
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.builder.editExerciseModal.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={exerciseNotes}
              onChange={(event) => setExerciseNotes(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      {/* Delete day / exercise modal */}
      <TrainerModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'day' ? t('plans.builder.deleteModal.deleteDay') : t('plans.builder.deleteModal.deleteExercise')}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setDeleteTarget(null)}
            >
              {t('plans.builder.deleteModal.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={submitting}
              onClick={confirmDelete}
            >
              {submitting ? t('plans.builder.deleteModal.submitting') : t('plans.builder.deleteModal.submit')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {deleteTarget?.type === 'day'
            ? t('plans.builder.deleteModal.confirmDay')
            : t('plans.builder.deleteModal.confirmExercise')}
        </p>
      </TrainerModal>

      <div className="text-right">
        <ButtonLink variant="text-accent" to="/trainer/exercises">
          {t('plans.builder.openExerciseLib')}
        </ButtonLink>
      </div>
    </TrainerPage>
  )
}

function PlanMetadataForm({
  name: initialName,
  description: initialDescription,
  readonly,
  submitting,
  onSave,
}: {
  name: string
  description: string
  readonly: boolean
  submitting: boolean
  onSave: (name: string, description: string) => Promise<void>
}) {
  const { t } = useTranslation('trainer')
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    setName(initialName)
    setDescription(initialDescription)
  }, [initialDescription, initialName])

  return (
    <form
      className="rogym-card rogym-card--compact grid gap-4 p-6 lg:grid-cols-[1fr_1.5fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave(name, description)
      }}
    >
      <label className="block space-y-2">
        <span className="rogym-field-label">{t('plans.builder.metadata.fieldName')}</span>
        <input
          className="rogym-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={readonly}
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="rogym-field-label">{t('plans.builder.metadata.fieldDescription')}</span>
        <input
          className="rogym-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={readonly}
        />
      </label>
      {!readonly && (
        <div className="self-end">
          <SubmitButton loading={submitting} disabled={!name.trim()}>
            {t('plans.builder.metadata.save')}
          </SubmitButton>
        </div>
      )}
    </form>
  )
}

const PlanDayCard = memo(function PlanDayCard({
  day,
  dayLabels,
  readonly,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: {
  day: WorkoutPlanDay
  dayLabels: string[]
  readonly: boolean
  onEditDay: (day: WorkoutPlanDay) => void
  onDeleteDay: (day: WorkoutPlanDay) => void
  onAddExercise: (day: WorkoutPlanDay) => void
  onEditExercise: (day: WorkoutPlanDay, exercise: WorkoutPlanExercise) => void
  onDeleteExercise: (day: WorkoutPlanDay, exercise: WorkoutPlanExercise) => void
}) {
  const { t } = useTranslation('trainer')
  const sortedExercises = useMemo(
    () => [...(day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [day.exercises]
  )

  function formatDuration(seconds: number | null): string {
    if (!seconds) return t('plans.builder.dayCard.durationUnset')
    if (seconds < 60) return t('plans.builder.dayCard.durationSeconds', { s: seconds })
    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60
    return remaining
      ? t('plans.builder.dayCard.durationMinutesSeconds', { m: minutes, s: remaining })
      : t('plans.builder.dayCard.durationMinutes', { m: minutes })
  }

  return (
    <section className="rogym-card rogym-card--compact p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="rogym-eyebrow">
            {t('plans.builder.dayCard.dayLabel', { dayName: dayLabels[day.dayOfWeek], dayNumber: day.dayNumber })}
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{day.name}</h3>
          {day.notes && <p className="mt-2 text-sm rogym-text-secondary">{day.notes}</p>}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button
              variant="outline-white"
              onClick={() => onEditDay(day)}
            >
              <Pencil size={15} /> {t('plans.builder.dayCard.edit')}
            </Button>
            <Button
              variant="danger"
              onClick={() => onDeleteDay(day)}
            >
              <Trash2 size={15} /> {t('plans.builder.dayCard.delete')}
            </Button>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {sortedExercises.map((item, index) => (
          <div
            key={item.planExerciseId}
            className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 md:flex-row md:items-center"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(66,224,158,0.12)] text-sm font-bold rogym-text-accent">
              {index + 1}
            </div>
            {(item.exercise?.gifUrl || item.exercise?.imageUrl) && (
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1 flex items-center justify-center">
                <img
                  src={item.exercise.gifUrl || item.exercise.imageUrl || ''}
                  alt={t('plans.builder.exerciseModal.illustrationAlt', { name: item.exercise.name })}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white">
                {item.exercise?.name ?? t('plans.builder.editExerciseModal.defaultName')}
              </div>
              <div className="mt-1 text-xs rogym-text-dim">
                {item.targetReps
                  ? t('plans.builder.dayCard.setRepSummary', {
                      sets: item.targetSets,
                      reps: item.targetReps,
                      duration: formatDuration(item.targetDurationSec ?? null),
                      rest: item.restSeconds ?? 0,
                    })
                  : t('plans.builder.dayCard.setTimeSummary', {
                      sets: item.targetSets,
                      duration: formatDuration(item.targetDurationSec ?? null),
                      rest: item.restSeconds ?? 0,
                    })}
                {item.targetWeightKg
                  ? t('plans.builder.dayCard.setWeightSummary', { weight: Number(item.targetWeightKg) })
                  : ''}
              </div>
              <div className="mt-1 text-xs rogym-text-secondary">
                {item.exercise?.targetMuscle?.name ?? t('plans.builder.dayCard.bodyPart')} ·{' '}
                {item.exercise?.equipment?.name ?? t('plans.builder.dayCard.noEquipment')}
              </div>
              {item.notes && <div className="mt-2 text-xs rogym-text-secondary">{item.notes}</div>}
            </div>
            {!readonly && (
              <div className="flex gap-2">
                <Button
                  variant="icon"
                  onClick={() => onEditExercise(day, item)}
                  aria-label={t('plans.builder.dayCard.editAriaLabel')}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="icon"
                  onClick={() => onDeleteExercise(day, item)}
                  aria-label={t('plans.builder.dayCard.deleteAriaLabel')}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            )}
          </div>
        ))}
        {sortedExercises.length === 0 && (
          <p className="py-3 text-sm rogym-text-dim">{t('plans.builder.dayCard.noDayExercise')}</p>
        )}
        {!readonly && (
          <Button
            variant="text-accent"
            onClick={() => onAddExercise(day)}
          >
            {t('plans.builder.dayCard.addExercise')}
          </Button>
        )}
      </div>
    </section>
  )
})
