import { FormEvent, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, Lock, Pencil, Plus, Trash2, Zap } from 'lucide-react'
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

const DAY_LABELS = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

export default function TrainerPlanBuilderPage() {
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [planData, exerciseData] = await Promise.all([
        workoutService.getPlan(id),
        workoutService.getExercises(),
      ])
      setPlan(planData)
      if (planData.status === 'archived') setWriteBlocked(true)
      setExercises(exerciseData)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải Plan Builder.'))
    } finally {
      setLoading(false)
    }
  }, [id])

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

  function handleMutationError(err: unknown, fallback: string) {
    const message = getApiError(err, fallback)
    if (
      getApiErrorCode(err) === 'PLAN_WRITE_BLOCKED' ||
      (isApiConflict(err) && message.toLocaleLowerCase('vi').includes('workout log'))
    ) {
      setWriteBlocked(true)
      setError(
        'Kế hoạch đã có dữ liệu tập luyện hoặc đang được sử dụng nên cấu trúc được chuyển sang chỉ đọc.'
      )
      return
    }
    setError(message)
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
      handleMutationError(err, 'Không thể cập nhật thông tin kế hoạch.')
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
      handleMutationError(err, 'Không thể lưu ngày tập. Số thứ tự ngày phải là duy nhất.')
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
        targetReps: selectedExercise.category === 'cardio' ? undefined : targetReps,
        targetDurationSec: targetDuration,
        targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
        restSeconds,
        notes: exerciseNotes.trim() || undefined,
      })
      setExerciseDay(null)
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể thêm bài tập vào ngày này.')
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
            editingPlanExercise.exercise.exercise?.category === 'cardio' ? undefined : targetReps,
          targetDurationSec: targetDuration,
          targetWeightKg: targetWeight ? Number(targetWeight) : 0,
          restSeconds,
          notes: exerciseNotes.trim() || '',
        }
      )
      setEditingPlanExercise(null)
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể cập nhật target bài tập.')
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
      handleMutationError(err, 'Không thể xóa vì dữ liệu lịch sử đang được bảo vệ.')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(status: 'active' | 'archived') {
    if (status === 'active' && (!plan?.days?.length || exerciseCount === 0)) {
      setError('Kế hoạch cần ít nhất một ngày và một bài tập trước khi kích hoạt.')
      return
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
          ? 'Không thể kích hoạt kế hoạch.'
          : 'Không thể lưu trữ kế hoạch khi còn assignment active.'
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
        eyebrow="Plan Builder"
        title={plan.name}
        description={
          readonly
            ? 'Kế hoạch đang ở chế độ chỉ đọc.'
            : 'Xây dựng cấu trúc ngày tập và target cho từng bài.'
        }
        actions={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/trainer/plans')}
            >
              <ArrowLeft size={16} /> Danh sách
            </button>
            {plan.status === 'draft' && !readonly && (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                disabled={submitting}
                onClick={() => changeStatus('active')}
              >
                <Zap size={16} /> Kích hoạt
              </button>
            )}
            {plan.status !== 'archived' && !readonly && (
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={submitting}
                onClick={() => changeStatus('archived')}
              >
                <Archive size={16} /> Lưu trữ
              </button>
            )}
          </>
        }
      />
      <div className="flex items-center gap-3">
        <TrainerStatusBadge status={plan.status} />
        <span className="text-sm rogym-text-dim">
          {groupedWeeks.length} tuần · {plan.days?.length ?? 0} ngày · {exerciseCount} bài tập
        </span>
      </div>
      {readonly && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Lock size={18} /> Plan đã lưu trữ hoặc có workout log nên không thể thay đổi cấu trúc.
        </div>
      )}
      {error && <TrainerErrorState message={error} onRetry={load} />}

      <PlanMetadataForm
        name={plan.name}
        description={plan.description ?? ''}
        readonly={readonly}
        submitting={submitting}
        onSave={saveMetadata}
      />

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Cấu trúc ngày tập</h2>
        {!readonly && (
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreateDay}>
            <Plus size={16} /> Thêm ngày
          </button>
        )}
      </div>
      {!plan.days?.length ? (
        <TrainerEmptyState
          title="Chưa có ngày tập"
          description="Thêm ít nhất một ngày, sau đó chọn bài tập từ thư viện."
          action={
            !readonly ? (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                onClick={openCreateDay}
              >
                Thêm ngày đầu tiên
              </button>
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
                  <h2 className="text-lg font-bold text-white">Tuần {week}</h2>
                  <p className="text-xs rogym-text-dim">{days.length} ngày có lịch tập</p>
                </div>
              </div>
              {days.map((day) => (
                <PlanDayCard
                  key={day.planDayId}
                  day={day}
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

      <TrainerModal
        open={dayOpen}
        title={editingDay ? 'Chỉnh sửa ngày tập' : 'Thêm ngày tập'}
        onClose={() => setDayOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setDayOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="plan-day-form" loading={submitting} disabled={!dayName.trim()}>
              Lưu ngày tập
            </SubmitButton>
          </>
        }
      >
        <form id="plan-day-form" className="space-y-4" onSubmit={saveDay}>
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="Tuần" min={1} value={weekNumber} onChange={setWeekNumber} />
            <label className="block space-y-2">
              <span className="rogym-field-label">Thứ trong tuần</span>
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
            <NumberField label="Ngày thứ" min={1} value={dayNumber} onChange={setDayNumber} />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên ngày tập</span>
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
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={dayNotes}
              onChange={(event) => setDayNotes(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(exerciseDay)}
        title={`Thêm bài tập vào ${exerciseDay?.name ?? ''}`}
        onClose={() => setExerciseDay(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setExerciseDay(null)}
            >
              Hủy
            </button>
            <SubmitButton
              form="plan-exercise-form"
              loading={submitting}
              disabled={!exerciseId || targetSets < 1}
            >
              Thêm bài tập
            </SubmitButton>
          </>
        }
      >
        <form id="plan-exercise-form" className="space-y-4" onSubmit={addExercise}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Bài tập</span>
            <TrainerSelect value={exerciseId} onValueChange={setExerciseId} required>
              <option value="">Chọn từ thư viện</option>
              {exercises.map((exercise) => (
                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                  {exercise.name} - {exercise.category}
                </option>
              ))}
            </TrainerSelect>
          </label>
          {selectedExercise && (
            <div className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4">
              {selectedExercise.imageUrl && (
                <img
                  src={selectedExercise.imageUrl}
                  alt={`Minh họa ${selectedExercise.name}`}
                  className="h-24 w-28 rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <div className="text-sm rogym-text-secondary">
                <div className="font-semibold text-white">{selectedExercise.name}</div>
                <div className="mt-1">
                  {selectedExercise.muscleGroup ?? 'Toàn thân'} ·{' '}
                  {selectedExercise.equipmentNeeded ?? 'Không cần dụng cụ'}
                </div>
                <p className="mt-2 line-clamp-3">{selectedExercise.description}</p>
              </div>
            </div>
          )}
          <ExerciseTargetFields
            category={selectedExercise?.category}
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
            <span className="rogym-field-label">Ghi chú kỹ thuật</span>
            <textarea
              className="rogym-input min-h-24"
              value={exerciseNotes}
              onChange={(event) => setExerciseNotes(event.target.value)}
            />
          </label>
          <p className="text-xs rogym-text-dim">
            Mỗi bài cần có đủ số set, số rep nếu áp dụng, thời gian tập và thời gian nghỉ.
          </p>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(editingPlanExercise)}
        title={`Chỉnh target ${editingPlanExercise?.exercise.exercise?.name ?? 'bài tập'}`}
        onClose={() => setEditingPlanExercise(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setEditingPlanExercise(null)}
            >
              Hủy
            </button>
            <SubmitButton form="edit-plan-exercise-form" loading={submitting}>
              Lưu target
            </SubmitButton>
          </>
        }
      >
        <form id="edit-plan-exercise-form" className="space-y-4" onSubmit={updateExerciseTarget}>
          <ExerciseTargetFields
            category={editingPlanExercise?.exercise.exercise?.category}
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
            <span className="rogym-field-label">Ghi chú kỹ thuật</span>
            <textarea
              className="rogym-input min-h-24"
              value={exerciseNotes}
              onChange={(event) => setExerciseNotes(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'day' ? 'Xóa ngày tập' : 'Xóa bài tập khỏi plan'}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              disabled={submitting}
              onClick={confirmDelete}
            >
              {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {deleteTarget?.type === 'day'
            ? 'Toàn bộ bài tập trong ngày này cũng sẽ bị xóa.'
            : 'Dữ liệu lịch sử đã ghi nhận sẽ được backend bảo vệ và có thể chặn thao tác này.'}
        </p>
      </TrainerModal>
      <div className="text-right">
        <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/exercises">
          Mở thư viện bài tập
        </Link>
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
        <span className="rogym-field-label">Tên kế hoạch</span>
        <input
          className="rogym-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={readonly}
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="rogym-field-label">Mô tả</span>
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
            Lưu thông tin
          </SubmitButton>
        </div>
      )}
    </form>
  )
}

const PlanDayCard = memo(function PlanDayCard({
  day,
  readonly,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: {
  day: WorkoutPlanDay
  readonly: boolean
  onEditDay: (day: WorkoutPlanDay) => void
  onDeleteDay: (day: WorkoutPlanDay) => void
  onAddExercise: (day: WorkoutPlanDay) => void
  onEditExercise: (day: WorkoutPlanDay, exercise: WorkoutPlanExercise) => void
  onDeleteExercise: (day: WorkoutPlanDay, exercise: WorkoutPlanExercise) => void
}) {
  const sortedExercises = useMemo(
    () => [...(day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [day.exercises]
  )

  return (
    <section className="rogym-card rogym-card--compact p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="rogym-eyebrow">
            {DAY_LABELS[day.dayOfWeek]} · Ngày {day.dayNumber}
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{day.name}</h3>
          {day.notes && <p className="mt-2 text-sm rogym-text-secondary">{day.notes}</p>}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => onEditDay(day)}
            >
              <Pencil size={15} /> Sửa
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              onClick={() => onDeleteDay(day)}
            >
              <Trash2 size={15} /> Xóa
            </button>
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
            {item.exercise?.imageUrl && (
              <img
                src={item.exercise.imageUrl}
                alt={`Minh họa ${item.exercise.name}`}
                className="h-20 w-full rounded-xl object-cover md:w-24"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white">{item.exercise?.name ?? 'Bài tập'}</div>
              <div className="mt-1 text-xs rogym-text-dim">
                {item.targetSets} set ·{' '}
                {item.targetReps ? `${item.targetReps} rep` : 'Theo thời gian'}
                {` · tập ${formatDuration(item.targetDurationSec)}`}
                {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)} kg` : ''}
                {` · nghỉ ${item.restSeconds ?? 0} giây`}
              </div>
              <div className="mt-1 text-xs rogym-text-secondary">
                {item.exercise?.muscleGroup ?? 'Toàn thân'} ·{' '}
                {item.exercise?.equipmentNeeded ?? 'Không cần dụng cụ'}
              </div>
              {item.notes && <div className="mt-2 text-xs rogym-text-secondary">{item.notes}</div>}
            </div>
            {!readonly && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                  onClick={() => onEditExercise(day, item)}
                  aria-label="Sửa target bài tập"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                  onClick={() => onDeleteExercise(day, item)}
                  aria-label="Xóa bài tập"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
        {sortedExercises.length === 0 && (
          <p className="py-3 text-sm rogym-text-dim">Ngày này chưa có bài tập.</p>
        )}
        {!readonly && (
          <button
            type="button"
            className="rogym-text-link rogym-text-link--accent"
            onClick={() => onAddExercise(day)}
          >
            + Thêm bài tập
          </button>
        )}
      </div>
    </section>
  )
})

function formatDuration(seconds: number | null) {
  if (!seconds) return 'chưa đặt'
  if (seconds < 60) return `${seconds} giây`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes} phút ${remaining} giây` : `${minutes} phút`
}
