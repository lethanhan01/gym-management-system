import { FormEvent, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Lock,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import {
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import { toast } from 'sonner'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import workoutService, {
  type Exercise,
  type ExerciseBodyPart,
  type ExerciseMuscle,
  type ExerciseEquipment,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'
import { ExerciseFilterDropdown } from '@/components/workout/ExerciseUI'
import { filterExercises } from '@/components/workout/exercise-data'
import { ExerciseTargetFields } from '@/components/workout/PlanBuilderUI'

function formatSec(seconds: number | null | undefined) {
  if (!seconds) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m}p${s}s` : `${m} phút`
}

const SuggestedPlanCard = memo(function SuggestedPlanCard({
  plan,
  onUse,
}: {
  plan: WorkoutPlan
  onUse: (p: WorkoutPlan) => void
}) {
  const { t } = useTranslation('member')
  const [expanded, setExpanded] = useState(false)
  const { totalDays, totalExercises, totalEstimated, sortedDays } = useMemo(() => {
    const days = [...(plan.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber)
    const exerciseCount = days.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0)
    const estimatedSeconds = days.reduce(
      (sum, day) =>
        sum +
        (day.exercises?.reduce((exerciseSum, exercise) => {
          const setTime = (exercise.targetDurationSec ?? 30) * exercise.targetSets
          const restTime = (exercise.restSeconds ?? 60) * (exercise.targetSets - 1)
          return exerciseSum + setTime + restTime
        }, 0) ?? 0),
      0
    )
    return {
      totalDays: days.length,
      totalExercises: exerciseCount,
      totalEstimated: Math.round(estimatedSeconds / 60),
      sortedDays: days,
    }
  }, [plan.days])

  return (
    <div className="rogym-card rogym-card--md rogym-sx-3f1e9a27">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rogym-sx-0c66f6c9">
                PT
              </span>
              <h3 className="break-words font-bold text-white">{plan.name}</h3>
            </div>
            {plan.description && (
              <p className="mt-1 text-sm rogym-sx-d88f932f">{plan.description}</p>
            )}
          </div>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary shrink-0 px-4 text-sm"
            onClick={() => onUse(plan)}
          >
            {t('workout.planBuilder.buttonUsePlan')}
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs rogym-sx-5e5c39ab">
          <span>
            <span className="font-semibold text-white">{totalDays}</span> {t('workout.planBuilder.unitDays')}
          </span>
          <span>
            <span className="font-semibold text-white">{totalExercises}</span> {t('workout.planBuilder.unitExercises')}
          </span>
          {totalEstimated > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              <span className="font-semibold text-white">{totalEstimated}</span> {t('workout.planBuilder.unitMinutes')}/ngày (ước tính)
            </span>
          )}
        </div>

        {/* Toggle exercises */}
        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? t('workout.planBuilder.buttonHideDetail') : t('workout.planBuilder.buttonShowDetail')}
        </button>
      </div>

      {expanded && (
        <div className="rogym-sx-8553bf9e">
          {sortedDays.map((day) => (
            <div key={day.planDayId} className="px-5 py-4 rogym-sx-6720cca7">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider rogym-sx-f27dac31">
                {t('workout.planBuilder.dayLabel', { n: day.dayNumber, name: day.name })}
              </p>
              {[...(day.exercises ?? [])]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((ex, i) => (
                  <div key={ex.planExerciseId} className="flex items-center gap-2 py-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold rogym-sx-252b3c13">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-white">{ex.exercise?.name ?? '—'}</span>
                      <span className="ml-2 text-xs rogym-sx-5e5c39ab">
                        {ex.targetSets} sets ·{' '}
                        {ex.targetReps
                          ? `${ex.targetReps} reps`
                          : (formatSec(ex.targetDurationSec) ?? '—')}
                        {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)}kg` : ''}
                        {ex.restSeconds ? ` · nghỉ ${ex.restSeconds}s` : ''}
                      </span>
                    </div>
                    {ex.exercise?.targetMuscle && (
                      <span className="shrink-0 text-xs rogym-sx-ed519d00">
                        {ex.exercise.targetMuscle.name}
                      </span>
                    )}
                  </div>
                ))}
              {!day.exercises?.length && (
                <p className="text-xs rogym-sx-ed519d00">{t('workout.planBuilder.noExercisesInDay')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MemberPlanBuilderPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const { planId: editPlanId } = useParams()
  const isEditMode = Boolean(editPlanId)
  const memberIdValue = useAuthStore((state) => state.user?.memberId)
  const memberId = memberIdValue ? String(memberIdValue) : undefined

  // Phase: 'name' → user enters plan name; 'build' → plan created, user builds days.
  // In edit mode we skip straight to 'build' and load the existing plan.
  const [phase, setPhase] = useState<'name' | 'build'>(editPlanId ? 'build' : 'name')
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(Boolean(editPlanId))
  // Plans that are archived or already have workout logs can't be mutated structurally.
  const [writeBlocked, setWriteBlocked] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Suggested plans from PT
  const [suggestedPlans, setSuggestedPlans] = useState<WorkoutPlan[]>([])
  const [loadingSuggested, setLoadingSuggested] = useState(false)

  // Name form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Add day form
  const [addingDay, setAddingDay] = useState(false)

  // Add exercise form: key = planDayId being edited
  const [addingExerciseTo, setAddingExerciseTo] = useState<WorkoutPlanDay | null>(null)

  // Delete confirm
  const [deleteDay, setDeleteDay] = useState<WorkoutPlanDay | null>(null)

  // Activate confirm
  const [activateConfirm, setActivateConfirm] = useState(false)

  // Whether member currently has an active PT-assigned plan
  const [hasActivePtPlan, setHasActivePtPlan] = useState(false)

  // Suggested plan pending apply (shown in warning modal)
  const [pendingSuggestedPlan, setPendingSuggestedPlan] = useState<WorkoutPlan | null>(null)

  // Plan metadata (name phase)
  const [startDate, setStartDate] = useState(todayInput())

  // Existing active self-plan (for warning before activate)
  const [existingSelfPlan, setExistingSelfPlan] = useState<{ name: string } | null>(null)

  const loadPlan = useCallback(async (planId: string) => {
    const updated = await workoutService.getPlan(planId)
    setPlan(updated)
    if (updated.status === 'archived') setWriteBlocked(true)
  }, [])

  // Edit mode: load the existing plan on mount
  useEffect(() => {
    if (!editPlanId) return
    setLoadingPlan(true)
    setError(null)
    loadPlan(editPlanId)
      .catch((err) => setError(getApiError(err, t('workout.planBuilder.errorLoadEdit'))))
      .finally(() => setLoadingPlan(false))
  }, [editPlanId, loadPlan, t])

  useEffect(() => {
    if (phase !== 'build') return
    setLoadingExercises(true)
    workoutService
      .getExercises({ pageSize: 100 })
      .then((result) => setExercises(result.data))
      .catch(() => setError(t('workout.planBuilder.errorLoadExercises')))
      .finally(() => setLoadingExercises(false))
  }, [phase, t])

  useEffect(() => {
    // Suggested plans only matter in the create flow (name phase)
    if (isEditMode) return
    setLoadingSuggested(true)
    workoutService
      .getSuggestedPlans()
      .then(setSuggestedPlans)
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoadingSuggested(false))
  }, [isEditMode])

  // Fetch existing active assignments to check for self-plan and PT plan
  useEffect(() => {
    if (!memberId) return
    workoutService
      .getAssignments(memberId, { status: 'active' })
      .then((assignments) => {
        const self = assignments.find((a) => !a.assignedByStaffId)
        const pt = assignments.find((a) => !!a.assignedByStaffId)
        setExistingSelfPlan(self ? { name: self.plan?.name ?? t('workout.session.defaultPlanName') } : null)
        setHasActivePtPlan(!!pt)
      })
      .catch(() => {
        /* silent */
      })
  }, [memberId, t])

  const applySuggestedPlan = useCallback(
    async (suggested: WorkoutPlan) => {
      if (!memberId) return
      setPendingSuggestedPlan(null)
      setSubmitting(true)
      setError(null)
      try {
        // PT plans are already active — only activate member-created drafts
        if (suggested.status !== 'active') {
          await workoutService.updatePlan(suggested.planId, { status: 'active' })
        }
        await workoutService.assignPlan(memberId, {
          planId: Number(suggested.planId),
          startDate: startDate || todayInput(),
        })
        navigate('/member/workout/plan')
      } catch {
        setError(t('workout.planBuilder.errorApply'))
      } finally {
        setSubmitting(false)
      }
    },
    [memberId, navigate, startDate, t]
  )

  const handleUseSuggestedPlan = useCallback(
    (suggested: WorkoutPlan) => {
      if (hasActivePtPlan) {
        toast.error(t('workout.planBuilder.errorHasPtPlan'))
        return
      }
      if (existingSelfPlan) {
        setPendingSuggestedPlan(suggested)
      } else {
        void applySuggestedPlan(suggested)
      }
    },
    [applySuggestedPlan, existingSelfPlan, hasActivePtPlan, t]
  )

  function handleMutationError(err: unknown, fallback: string, retryAction?: () => void) {
    const code = getApiErrorCode(err)
    if (code === 'PLAN_WRITE_BLOCKED') {
      setWriteBlocked(true)
      toast.error(t('workout.planBuilder.errorWriteBlocked'))
      return
    }
    const message = getApiError(err, fallback)
    if (retryAction) {
      toast.error(message, {
        action: { label: t('button.retry', { defaultValue: 'Thử lại' }), onClick: retryAction },
      })
    } else {
      toast.error(message)
    }
  }

  async function createPlan(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await workoutService.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setPlan(created)
      setPhase('build')
    } catch {
      toast.error(t('workout.planBuilder.errorCreatePlan'), {
        action: { label: t('button.retry', { defaultValue: 'Thử lại' }), onClick: () => createPlan(e) },
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function addDay(dayName: string) {
    if (!plan || !dayName.trim()) return
    setSubmitting(true)
    setError(null)
    const numbers = plan.days?.map((d) => d.dayNumber) ?? []
    const nextNum = numbers.length ? Math.max(...numbers) + 1 : 1
    try {
      await workoutService.addPlanDay(plan.planId, {
        weekNumber: Math.floor((nextNum - 1) / 7) + 1,
        dayOfWeek: ((nextNum - 1) % 7) + 1,
        dayNumber: nextNum,
        name: dayName.trim(),
      })
      setAddingDay(false)
      await loadPlan(plan.planId)
    } catch (err) {
      handleMutationError(err, t('workout.planBuilder.errorAddDay'), () => addDay(dayName))
    } finally {
      setSubmitting(false)
    }
  }

  async function addExercise(
    day: WorkoutPlanDay,
    selectedExercise: Exercise,
    targets: ExerciseTargets
  ) {
    if (!plan) return
    setSubmitting(true)
    setError(null)
    const nextIdx = day.exercises?.length
      ? Math.max(...day.exercises.map((exercise) => exercise.orderIndex)) + 1
      : 0
    try {
      await workoutService.addPlanExercise(plan.planId, day.planDayId, {
        exerciseId: Number(selectedExercise.exerciseId),
        orderIndex: nextIdx,
        targetSets: targets.sets,
        targetReps: selectedExercise.bodyPart?.name?.toLowerCase() === 'cardio' ? undefined : targets.reps,
        targetDurationSec: selectedExercise.bodyPart?.name?.toLowerCase() === 'cardio' ? targets.duration : undefined,
        targetWeightKg: targets.weight ? Number(targets.weight) : undefined,
        restSeconds: targets.restSeconds,
      })
      setAddingExerciseTo(null)
      await loadPlan(plan.planId)
    } catch (err) {
      handleMutationError(err, t('workout.planBuilder.errorAddExercise'), () => addExercise(day, selectedExercise, targets))
    } finally {
      setSubmitting(false)
    }
  }

  async function removeDay(day: WorkoutPlanDay) {
    if (!plan) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.deletePlanDay(plan.planId, day.planDayId)
      setDeleteDay(null)
      await loadPlan(plan.planId)
    } catch (err) {
      handleMutationError(err, t('workout.planBuilder.errorDeleteDay'), () => removeDay(day))
    } finally {
      setSubmitting(false)
    }
  }

  async function removeExercise(dayId: string, planExerciseId: string) {
    if (!plan) return
    setError(null)
    try {
      await workoutService.deletePlanExercise(plan.planId, dayId, planExerciseId)
      await loadPlan(plan.planId)
    } catch (err) {
      handleMutationError(err, t('workout.planBuilder.errorRemoveExercise'), () => removeExercise(dayId, planExerciseId))
    }
  }

  async function activate() {
    if (!plan || !memberId) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      await workoutService.assignPlan(memberId, {
        planId: Number(plan.planId),
        startDate: startDate || todayInput(),
      })
      navigate('/member/workout/plan')
    } catch (err) {
      toast.error(getApiError(err, t('workout.planBuilder.errorActivate')), {
        action: { label: t('button.retry', { defaultValue: 'Thử lại' }), onClick: activate },
      })
    } finally {
      setSubmitting(false)
    }
  }

  // "Lưu" just keeps the plan in the member's personal list. The plan and all its
  // days/exercises are already persisted (as a draft) during building, so we only
  // need to return to the list — no archiving, the plan stays editable.
  function saveToList() {
    navigate('/member/workout/plan')
  }

  const exerciseCount = useMemo(
    () => plan?.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0,
    [plan?.days]
  )
  const sortedDays = useMemo(
    () => [...(plan?.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber),
    [plan?.days]
  )
  const canActivate = (plan?.days?.length ?? 0) > 0 && exerciseCount > 0
  const readonly = writeBlocked || plan?.status === 'archived'

  // ─── Edit mode: loading / not-found guards ───────────────────────────
  if (isEditMode && loadingPlan) {
    return (
      <MemberPage>
        <MemberPageHeader eyebrow={t('workout.planBuilder.builderEyebrow')} title={t('workout.planBuilder.editTitle')} />
        <MemberSkeleton rows={5} />
      </MemberPage>
    )
  }
  if (isEditMode && !plan) {
    return (
      <MemberPage>
        <MemberPageHeader
          eyebrow={t('workout.planBuilder.builderEyebrow')}
          title={t('workout.planBuilder.editTitle')}
          actions={
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/member/workout/plan')}
            >
              <ArrowLeft size={15} /> {t('workout.planBuilder.buttonBack')}
            </button>
          }
        />
        <MemberErrorState message={error ?? t('workout.planBuilder.notFound')} />
      </MemberPage>
    )
  }

  // ─── Phase: enter name ───────────────────────────────────────────────
  if (phase === 'name') {
    return (
      <MemberPage>
        <MemberPageHeader
          eyebrow={t('workout.planBuilder.eyebrow')}
          title={t('workout.planBuilder.title')}
          description={t('workout.planBuilder.namePhaseDesc')}
          actions={
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/member/workout/plan')}
            >
              <ArrowLeft size={15} /> {t('workout.planBuilder.buttonBack')}
            </button>
          }
        />
        <form onSubmit={(e) => void createPlan(e)} className="space-y-4 rogym-sx-19e5bf8c">
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('workout.planBuilder.fieldName')}</span>
            <input
              className="rogym-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder={t('workout.planBuilder.fieldNamePlaceholder2')}
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('workout.planBuilder.fieldDesc')}</span>
            <textarea
              className="rogym-input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workout.planBuilder.fieldDescPlaceholder')}
            />
          </label>

          {/* Start date */}
          <div className="block space-y-2">
            <span className="rogym-field-label">{t('workout.planBuilder.fieldStartDate')}</span>
            <DatePickerInput
              value={startDate}
              onChange={setStartDate}
              min={todayInput()}
              placeholder={t('workout.planBuilder.startDatePlaceholder')}
              aria-label={t('workout.planBuilder.fieldStartDate')}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rogym-btn rogym-btn--primary"
              disabled={!name.trim() || submitting}
            >
              {submitting ? t('workout.planBuilder.buttonCreating') : t('workout.planBuilder.buttonNext')}
            </button>
          </div>
        </form>

        {/* Suggested plans from PT */}
        <div className="mt-2">
          <div className="mb-4 flex items-center gap-3">
            <BookOpen size={18} className="rogym-sx-f27dac31" />
            <h2 className="text-base font-bold text-white">{t('workout.planBuilder.suggestedTitle')}</h2>
            <span className="rounded-full px-2 py-0.5 text-xs rogym-sx-7041f1d2">
              {t('workout.planBuilder.suggestedDesc')}
            </span>
          </div>
          {loadingSuggested ? (
            <MemberSkeleton rows={2} />
          ) : suggestedPlans.length === 0 ? (
            <div className="rounded-[16px] p-5 text-center text-sm rogym-sx-0e44a235">
              <Dumbbell size={28} className="mx-auto mb-2 rogym-sx-ed519d00" />
              {t('workout.planBuilder.noSuggestions')}
            </div>
          ) : (
            <div className="space-y-4">
              {suggestedPlans.map((p) => (
                <SuggestedPlanCard key={p.planId} plan={p} onUse={handleUseSuggestedPlan} />
              ))}
            </div>
          )}
        </div>

        {/* Replace warning modal for suggested plan */}
        {pendingSuggestedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 rogym-sx-bd0c1b5e">
            <div className="w-full max-w-sm space-y-4 rounded-[20px] p-6 rogym-sx-70b08524">
              <p className="text-base font-bold text-white">{t('workout.planBuilder.replaceModal.title')}</p>
              <p className="text-sm rogym-sx-d88f932f">
                {t('workout.planBuilder.replaceModal.body', { name: existingSelfPlan?.name ?? '' })}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white px-4"
                  onClick={() => setPendingSuggestedPlan(null)}
                >
                  {t('workout.planBuilder.replaceModal.buttonCancel')}
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary px-4"
                  disabled={submitting}
                  onClick={() => void applySuggestedPlan(pendingSuggestedPlan)}
                >
                  {submitting ? t('workout.planBuilder.processingBtn') : t('workout.planBuilder.replaceModal.buttonApply')}
                </button>
              </div>
            </div>
          </div>
        )}
      </MemberPage>
    )
  }

  // ─── Phase: build plan ───────────────────────────────────────────────
  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.planBuilder.builderEyebrow')}
        title={plan?.name ?? t('workout.session.defaultPlanName')}
        description={
          readonly
            ? t('workout.planBuilder.builderDescReadonly')
            : isEditMode
              ? t('workout.planBuilder.builderDescEdit')
              : t('workout.planBuilder.builderDescBuild')
        }
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => navigate('/member/workout/plan')}
          >
            <ArrowLeft size={15} /> {isEditMode ? t('workout.planBuilder.buttonBack') : t('workout.planBuilder.buttonCancel')}
          </button>
        }
      />

      {error && <MemberErrorState message={error} />}

      {readonly && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Lock size={18} className="shrink-0" /> {t('workout.planBuilder.readonlyBanner')}
        </div>
      )}

      {/* Stats mini row */}
      <div className="flex items-center gap-6 text-sm rogym-sx-997622ed">
        <span className="rogym-sx-d88f932f">
          <span className="font-semibold text-white">{plan?.days?.length ?? 0}</span> {t('workout.planBuilder.unitDays')}
        </span>
        <span className="rogym-sx-d88f932f">
          <span className="font-semibold text-white">{exerciseCount}</span> {t('workout.planBuilder.unitExercises')}
        </span>
      </div>

      {/* Days */}
      {loadingExercises ? (
        <MemberSkeleton rows={3} />
      ) : (
        <div className="space-y-3">
          {sortedDays.map((day) => (
            <div key={day.planDayId} className="rogym-sx-013ea4c1">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-3 rogym-sx-dd0d9e7c">
                <div>
                  <p className="font-semibold text-white">
                    {t('workout.planBuilder.dayHeader', { n: day.dayNumber, name: day.name })}
                  </p>
                  <p className="text-xs rogym-sx-5e5c39ab">{day.exercises?.length ?? 0} {t('workout.planBuilder.unitExercises')}</p>
                </div>
                {readonly ? null : deleteDay?.planDayId === day.planDayId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-200">{t('workout.planBuilder.buttonDeleteDay')}</span>
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
                      disabled={submitting}
                      onClick={() => void removeDay(day)}
                    >
                      {t('workout.planBuilder.buttonDeleteDayConfirm')}
                    </button>
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
                      onClick={() => setDeleteDay(null)}
                    >
                      {t('workout.planBuilder.buttonDeleteDayCancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                    onClick={() => setDeleteDay(day)}
                    aria-label={t('workout.planBuilder.buttonDeleteDayConfirm')}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Exercises */}
              <div className="p-4">
                {[...(day.exercises ?? [])]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((ex, idx) => (
                    <div
                      key={ex.planExerciseId}
                      className="flex items-center gap-3 py-2 rogym-sx-6720cca7"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold rogym-sx-252b3c13">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {ex.exercise?.name ?? t('workout.session.defaultExerciseName')}
                        </p>
                        <p className="text-xs rogym-sx-5e5c39ab">
                          {ex.targetSets} sets ·{' '}
                          {ex.targetReps
                            ? `${ex.targetReps} reps`
                            : `${ex.targetDurationSec ?? 0} ${t('workout.planBuilder.unitSeconds')}`}
                          {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                        </p>
                      </div>
                      {!readonly && (
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                          onClick={() => void removeExercise(day.planDayId, ex.planExerciseId)}
                          aria-label={t('workout.planBuilder.errorRemoveExercise')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                {/* Add exercise inline */}
                {readonly ? (
                  (day.exercises?.length ?? 0) === 0 && (
                    <p className="mt-2 text-xs rogym-sx-5e5c39ab">{t('workout.planBuilder.noExercisesInDay')}</p>
                  )
                ) : addingExerciseTo?.planDayId === day.planDayId ? (
                  <AddExerciseForm
                    day={day}
                    exercises={exercises}
                    submitting={submitting}
                    onCancel={() => setAddingExerciseTo(null)}
                    onSubmit={addExercise}
                  />
                ) : (
                  <button
                    type="button"
                    className="rogym-text-link rogym-text-link--accent mt-3"
                    onClick={() => setAddingExerciseTo(day)}
                  >
                    {t('workout.planBuilder.buttonAddExercise')}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add day */}
          {readonly ? (
            sortedDays.length === 0 && (
              <p className="text-center text-sm rogym-sx-5e5c39ab">{t('workout.planBuilder.noDays')}</p>
            )
          ) : addingDay ? (
            <AddDayForm
              submitting={submitting}
              onCancel={() => setAddingDay(false)}
              onSubmit={addDay}
            />
          ) : (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white w-full justify-center"
              onClick={() => setAddingDay(true)}
            >
              <Plus size={16} /> {t('workout.planBuilder.buttonAddDay')}
            </button>
          )}
        </div>
      )}

      {/* Floating action bar — clears the desktop sidebar and mobile bottom navigation. */}
      <div className="fixed bottom-[calc(var(--rogym-bottom-nav-height)+var(--rogym-bottom-nav-center-action-clearance)+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[45] px-4 py-3 rogym-sx-e122cbce md:bottom-0 md:left-20 md:z-auto md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <p className="w-full text-sm rogym-sx-d88f932f md:w-auto">
            {t('workout.planBuilder.floatingBar.summary', { days: plan?.days?.length ?? 0, exercises: exerciseCount })}
            {!canActivate && (
              <span className="rogym-sx-5e5c39ab"> — {t('workout.planBuilder.floatingBar.validationError')}</span>
            )}
          </p>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            {/* Read-only plan: no activate/archive actions */}
            {readonly ? (
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white w-full justify-center px-4 md:w-auto"
                onClick={() => navigate('/member/workout/plan')}
              >
                <ArrowLeft size={15} /> {t('workout.planBuilder.buttonBack')}
              </button>
            ) : activateConfirm ? (
              <>
                {existingSelfPlan ? (
                  <span className="break-words text-xs text-amber-200">
                    {t('workout.planBuilder.confirmActivateReplace', { name: existingSelfPlan.name })}
                  </span>
                ) : (
                  <span className="break-words text-xs rogym-sx-5e5c39ab">{t('workout.planBuilder.confirmActivate')}</span>
                )}
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary w-full justify-center px-4 md:w-auto"
                  disabled={submitting}
                  onClick={() => void activate()}
                >
                  {submitting ? t('workout.planBuilder.processingBtn') : t('workout.planBuilder.floatingBar.buttonConfirm')}
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white w-full justify-center px-4 md:w-auto"
                  onClick={() => setActivateConfirm(false)}
                >
                  {t('workout.planBuilder.floatingBar.buttonCancel')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white w-full justify-center px-4 md:w-auto"
                  disabled={submitting}
                  onClick={saveToList}
                >
                  <Archive size={15} /> {t('workout.planBuilder.floatingBar.buttonSave')}
                </button>
                {!hasActivePtPlan && (
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--primary w-full justify-center px-6 md:w-auto"
                    disabled={!canActivate || submitting}
                    onClick={() => setActivateConfirm(true)}
                  >
                    <Zap size={15} /> {t('workout.planBuilder.floatingBar.buttonActivate')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {hasActivePtPlan && !readonly && !activateConfirm && (
          <p className="mt-2 text-xs text-amber-300">
            {t('workout.planBuilder.ptPlanWarning')}
          </p>
        )}
      </div>

      {/* Mobile reserves room for the tallest action-bar state above the bottom navigation. */}
      <div className="h-[calc(var(--rogym-bottom-nav-height)+var(--rogym-bottom-nav-center-action-clearance)+env(safe-area-inset-bottom,0px)+18rem)] md:h-20" />
    </MemberPage>
  )
}

interface ExerciseTargets {
  sets: number
  reps: number
  duration: number
  weight: string
  restSeconds: number
}

function AddExerciseForm({
  day,
  exercises,
  submitting,
  onCancel,
  onSubmit,
}: {
  day: WorkoutPlanDay
  exercises: Exercise[]
  submitting: boolean
  onCancel: () => void
  onSubmit: (day: WorkoutPlanDay, exercise: Exercise, targets: ExerciseTargets) => Promise<void>
}) {
  const { t } = useTranslation('member')
  const [exerciseId, setExerciseId] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [duration, setDuration] = useState(60)
  const [weight, setWeight] = useState('')
  const [restSeconds, setRestSeconds] = useState(60)
  const [search, setSearch] = useState('')
  const [bodyPartId, setBodyPartId] = useState<number | undefined>()
  const [targetMuscleId, setTargetMuscleId] = useState<number | undefined>()
  const [equipmentId, setEquipmentId] = useState<number | undefined>()
  const [filterOpen, setFilterOpen] = useState(false)
  
  const [draftBodyPartId, setDraftBodyPartId] = useState<number | undefined>()
  const [draftTargetMuscleId, setDraftTargetMuscleId] = useState<number | undefined>()
  const [draftEquipmentId, setDraftEquipmentId] = useState<number | undefined>()

  const [bodyParts, setBodyParts] = useState<ExerciseBodyPart[]>([])
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([])
  const [equipments, setEquipments] = useState<ExerciseEquipment[]>([])

  useEffect(() => {
    void Promise.all([
      workoutService.getBodyParts(),
      workoutService.getMuscles(),
      workoutService.getEquipments(),
    ]).then(([bp, mu, eq]) => {
      setBodyParts(bp)
      setMuscles(mu)
      setEquipments(eq)
    })
  }, [])

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.exerciseId === exerciseId) ?? null,
    [exerciseId, exercises]
  )
  const filteredExercises = useMemo(
    () => filterExercises(exercises, search, bodyPartId, targetMuscleId, equipmentId),
    [bodyPartId, targetMuscleId, equipmentId, exercises, search]
  )
  const activeFilterCount = [bodyPartId, targetMuscleId, equipmentId].filter((v) => v !== undefined).length

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!selectedExercise) return
        void onSubmit(day, selectedExercise, { sets, reps, duration, weight, restSeconds })
      }}
      className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <div className="space-y-2">
        <span className="rogym-field-label block">{t('workout.planBuilder.addExercise.title')}</span>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 rogym-sx-5e5c39ab"
              size={13}
            />
            <input
              className="rogym-input py-2 pl-9 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('workout.planBuilder.addExercise.searchPlaceholder')}
            />
          </div>
          <ExerciseFilterDropdown
            open={filterOpen}
            onOpenChange={(open) => {
              if (open) {
                setDraftBodyPartId(bodyPartId)
                setDraftTargetMuscleId(targetMuscleId)
                setDraftEquipmentId(equipmentId)
                setFilterOpen(true)
              } else {
                setFilterOpen(false)
              }
            }}
            activeCount={activeFilterCount}
            bodyPartId={draftBodyPartId}
            targetMuscleId={draftTargetMuscleId}
            equipmentId={draftEquipmentId}
            bodyParts={bodyParts}
            muscles={muscles}
            equipments={equipments}
            onChange={(fields) => {
              if ('bodyPartId' in fields) setDraftBodyPartId(fields.bodyPartId)
              if ('targetMuscleId' in fields) setDraftTargetMuscleId(fields.targetMuscleId)
              if ('equipmentId' in fields) setDraftEquipmentId(fields.equipmentId)
            }}
            onApply={() => {
              setBodyPartId(draftBodyPartId)
              setTargetMuscleId(draftTargetMuscleId)
              setEquipmentId(draftEquipmentId)
              setExerciseId('')
              setFilterOpen(false)
            }}
          />
        </div>
        <div className="max-h-44 overflow-y-auto rounded-xl rogym-sx-9ff6a44e">
          {filteredExercises.length === 0 ? (
            <p className="py-4 text-center text-xs rogym-sx-5e5c39ab">{t('workout.planBuilder.addExercise.notFound')}</p>
          ) : (
            filteredExercises.map((exercise) => (
              <button
                key={exercise.exerciseId}
                type="button"
                onClick={() => setExerciseId(exercise.exerciseId)}
                className={`rogym-exercise-option flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                  exerciseId === exercise.exerciseId ? 'is-active' : ''
                }`}
              >
                <span className="flex-1 font-medium">{exercise.name}</span>
                {exercise.targetMuscle && (
                  <span className="shrink-0 text-xs rogym-sx-5e5c39ab">{exercise.targetMuscle.name}</span>
                )}
              </button>
            ))
          )}
        </div>
        {selectedExercise && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm rogym-sx-1fad55bf">
            <span className="flex-1 font-medium rogym-sx-f27dac31">{selectedExercise.name}</span>
            <button type="button" onClick={() => setExerciseId('')} aria-label="Bỏ chọn">
              <X size={13} className="rogym-sx-5e5c39ab" />
            </button>
          </div>
        )}
      </div>
      <ExerciseTargetFields
        isCardio={selectedExercise?.bodyPart?.name?.toLowerCase() === 'cardio'}
        gridClassName="grid gap-3 md:grid-cols-3"
        compact
        restOutsideGrid
        weightPlaceholder="Tùy chọn"
        values={{ sets, reps, duration, weight, restSeconds }}
        onChange={{
          sets: setSets,
          reps: setReps,
          duration: setDuration,
          weight: setWeight,
          restSeconds: setRestSeconds,
        }}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onCancel}>
          {t('workout.planBuilder.addExercise.buttonCancel')}
        </button>
        <button
          type="submit"
          className="rogym-btn rogym-btn--primary"
          disabled={!exerciseId || submitting}
        >
          {submitting ? t('workout.planBuilder.addExercise.buttonAdding') : t('workout.planBuilder.addExercise.buttonAdd')}
        </button>
      </div>
    </form>
  )
}

function AddDayForm({
  submitting,
  onCancel,
  onSubmit,
}: {
  submitting: boolean
  onCancel: () => void
  onSubmit: (name: string) => Promise<void>
}) {
  const { t } = useTranslation('member')
  const [name, setName] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(name)
      }}
      className="space-y-3 rogym-sx-ba262316"
    >
      <p className="text-sm font-semibold text-white">{t('workout.planBuilder.addDayForm.title')}</p>
      <label className="block space-y-1.5">
        <span className="rogym-field-label">{t('workout.planBuilder.addDayForm.fieldName')}</span>
        <input
          className="rogym-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          required
          autoFocus
          placeholder={t('workout.planBuilder.addDayForm.namePlaceholder')}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onCancel}>
          {t('workout.planBuilder.buttonCancel')}
        </button>
        <button
          type="submit"
          className="rogym-btn rogym-btn--primary"
          disabled={!name.trim() || submitting}
        >
          {submitting ? t('workout.planBuilder.addDayForm.buttonAdding') : t('workout.planBuilder.addDayForm.buttonAdd')}
        </button>
      </div>
    </form>
  )
}
