import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardList,
  Dumbbell,
  Eye,
  List,
  Pencil,
  Play,
  Trash2,
  X,
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
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from 'react-i18next'

// ── Active plan card (assignments) ────────────────────────────────────────────

function PlanCard({
  assignment,
  plan,
  canEdit,
  isPT,
  onDelete,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  canEdit: boolean
  isPT: boolean
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation('member')
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [detailDay, setDetailDay] = useState<WorkoutPlanDay | null>(null)

  const totalDays = plan?.days?.length ?? assignment.plan?.days?.length ?? 0
  const totalExercises = plan?.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0

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

  async function handleDelete() {
    if (!plan) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await workoutService.deletePlan(plan.planId)
      setDeleteConfirm(false)
      onDelete()
    } catch {
      setDeleteError(t('workout.myPlan.errorDelete'))
    } finally {
      setDeleting(false)
    }
  }

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
                {isPT ? t('workout.myPlan.sourceTrainer') : t('workout.myPlan.sourcePersonal')}
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
                <span className="font-semibold text-white">{totalDays}</span> {t('workout.myPlan.unitDays')}
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> {t('workout.myPlan.unitExercises')}
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> {t('workout.myPlan.unitMinPerDay')}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--elevated"
              onClick={() => navigate('/member/workout/create-session')}
              aria-label="Tạo buổi tập"
            >
              <Play size={14} />
            </button>
            {canEdit && (
              <button
                type="button"
                className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                onClick={() => navigate(`/member/workout/builder/${assignment.planId}`)}
                aria-label="Sửa plan"
              >
                <Pencil size={14} />
              </button>
            )}
            {canEdit && !deleteConfirm && (
              <button
                type="button"
                className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                onClick={() => setDeleteConfirm(true)}
                aria-label="Xóa plan"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {deleteConfirm && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2">
            <span className="flex-1 text-xs text-red-200">{t('workout.myPlan.buttonDeletePlan')}</span>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? t('workout.myPlan.buttonDeleting') : t('workout.myPlan.buttonDelete')}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
              onClick={() => setDeleteConfirm(false)}
            >
              {t('workout.myPlan.buttonCancelDelete')}
            </button>
          </div>
        )}
        {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? t('workout.myPlan.buttonHideDetail') : t('workout.myPlan.buttonShowDetail')}
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
                  <p className="text-xs rogym-sx-5e5c39ab">{t('workout.myPlan.exerciseCount', { count: day.exercises?.length ?? 0 })}</p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--icon rogym-btn--outline-white shrink-0"
                  onClick={() => setDetailDay(day)}
                  aria-label={t('workout.myPlan.buttonDayDetailAria', { name: day.name })}
                  title={t('workout.myPlan.buttonDayDetailAria', { name: day.name })}
                >
                  <Eye size={16} />
                </button>
              </div>
            ))}
        </div>
      )}

      {detailDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 rogym-sx-8578aed4"
          onClick={() => setDetailDay(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[24px] rogym-sx-1f8ae2ef"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-6 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{detailDay.name}</h2>
                <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
                  {t('workout.myPlan.exerciseCount', { count: detailDay.exercises?.length ?? 0 })}
                </p>
              </div>
              <button
                type="button"
                className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                onClick={() => setDetailDay(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 px-6 pb-6">
              {[...(detailDay.exercises ?? [])]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((ex, i) => {
                  const isCardio = ex.exercise?.category === 'cardio'
                  return (
                    <div
                      key={ex.planExerciseId}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {ex.exercise?.name ?? t('workout.myPlan.exerciseFallback')}
                        </p>
                        <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
                          {ex.targetSets} sets ·{' '}
                          {isCardio
                            ? `${ex.targetDurationSec ?? 0} ${t('workout.myPlan.unitSeconds')}`
                            : `${ex.targetReps ?? 0} reps`}
                          {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Saved (archived) plan card ─────────────────────────────────────────────────

function SavedPlanCard({
  plan,
  hasPtPlan,
  onApply,
  onDelete,
}: {
  plan: WorkoutPlan
  hasPtPlan: boolean
  onApply: (p: WorkoutPlan) => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation('member')
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isArchived = plan.status === 'archived'
  const totalDays = plan.days?.length ?? 0
  const totalExercises = plan.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0
  const totalEstSec =
    plan.days?.reduce(
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

  async function handleDelete() {
    setDeleting(true)
    try {
      await workoutService.deletePlan(plan.planId)
      setDeleteConfirm(false)
      onDelete()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="rogym-plan-card rogym-card rogym-card--md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rogym-sx-7041f1d2">
                <Archive size={10} />{' '}
                {isArchived ? t('workout.myPlan.savedPlanArchived') : plan.status === 'draft' ? t('workout.myPlan.savedPlanDraft') : t('workout.myPlan.savedPlanPaused')}
              </span>
              <h3 className="break-words font-bold text-white">{plan.name}</h3>
            </div>
            {plan.description && (
              <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>
            )}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> {t('workout.myPlan.unitDays')}
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> {t('workout.myPlan.unitExercises')}
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> {t('workout.myPlan.unitMinPerDay')}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {!hasPtPlan && (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary px-3 py-1.5 text-xs"
                onClick={() => onApply(plan)}
              >
                {t('workout.myPlan.buttonApply')}
              </button>
            )}
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs"
              onClick={() => navigate(`/member/workout/builder/${plan.planId}`)}
            >
              {isArchived ? (
                <>
                  <Eye size={13} /> {t('workout.myPlan.buttonView')}
                </>
              ) : (
                <>
                  <Pencil size={13} />
                </>
              )}
            </button>
            {!deleteConfirm && (
              <button
                type="button"
                className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                onClick={() => setDeleteConfirm(true)}
                aria-label={t('workout.myPlan.buttonDelete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {deleteConfirm && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2">
            <span className="flex-1 text-xs text-red-200">{t('workout.myPlan.deleteSavedConfirm')}</span>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? t('workout.myPlan.buttonDeleting') : t('workout.myPlan.buttonDelete')}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
              onClick={() => setDeleteConfirm(false)}
            >
              {t('workout.myPlan.buttonCancelDelete')}
            </button>
          </div>
        )}

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? t('workout.myPlan.buttonHideDetail') : t('workout.myPlan.buttonShowDetail')}
        </button>
      </div>

      {expanded && plan.days && (
        <div className="rogym-sx-8553bf9e">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div key={day.planDayId} className="px-5 py-3 rogym-sx-6720cca7">
                <p className="text-sm font-medium text-white">{day.name}</p>
                <p className="text-xs rogym-sx-5e5c39ab">{t('workout.myPlan.exerciseCount', { count: day.exercises?.length ?? 0 })}</p>
                {[...(day.exercises ?? [])]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((ex, i) => {
                    const isCardio = ex.exercise?.category === 'cardio'
                    return (
                      <div key={ex.planExerciseId} className="mt-1 flex items-center gap-2 py-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold rogym-sx-252b3c13">
                          {i + 1}
                        </span>
                        <span className="text-sm text-white">{ex.exercise?.name ?? '—'}</span>
                        <span className="text-xs rogym-sx-5e5c39ab">
                          {ex.targetSets}×
                          {isCardio
                            ? `${ex.targetDurationSec ?? 0}s`
                            : `${ex.targetReps ?? 0} reps`}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyPlanPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('member')
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [fullPlans, setFullPlans] = useState<Map<string, WorkoutPlan>>(new Map())
  const [memberPlans, setMemberPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingPlan, setApplyingPlan] = useState(false)

  const load = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [all, ownPlans] = await Promise.all([
        workoutService.getAssignments(memberId),
        workoutService.getPlans(),
      ])
      setAssignments(all)
      setMemberPlans(ownPlans)

      const active = all.filter((a) => a.status === 'active')
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
      setError(t('workout.myPlan.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [memberId, t])

  useEffect(() => {
    void load()
  }, [load])

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'active'),
    [assignments]
  )
  const ptPlans = useMemo(
    () => activeAssignments.filter((a) => !!a.assignedByStaffId),
    [activeAssignments]
  )
  const selfPlans = useMemo(
    () => activeAssignments.filter((a) => !a.assignedByStaffId),
    [activeAssignments]
  )
  const hasPtPlan = ptPlans.length > 0

  // Saved plans: member-created plans NOT currently active as a self-assignment
  const activeSelfPlanIds = useMemo(
    () => new Set(selfPlans.map((a) => a.planId)),
    [selfPlans]
  )
  const savedPlans = useMemo(
    () => memberPlans.filter((p) => !activeSelfPlanIds.has(p.planId)),
    [memberPlans, activeSelfPlanIds]
  )

  async function handleApplySavedPlan(plan: WorkoutPlan) {
    if (!memberId) return
    setApplyingPlan(true)
    try {
      if (plan.status !== 'active') {
        await workoutService.updatePlan(plan.planId, { status: 'active' })
      }
      const today = new Date()
      const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await workoutService.assignPlan(memberId, {
        planId: Number(plan.planId),
        startDate,
      })
      await load()
    } catch {
      // silently reload - backend will return error if PT plan blocks it
      await load()
    } finally {
      setApplyingPlan(false)
    }
  }

  if (loading)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow={t('workout.myPlan.eyebrow')} title={t('workout.myPlan.pageTitle')} />
        <MemberSkeleton rows={6} />
      </MemberPage>
    )

  if (error)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow={t('workout.myPlan.eyebrow')} title={t('workout.myPlan.pageTitle')} />
        <MemberErrorState message={error} onRetry={load} />
      </MemberPage>
    )

  const hasAnything = activeAssignments.length > 0 || savedPlans.length > 0

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.myPlan.eyebrow')}
        title={t('workout.myPlan.pageTitle')}
        description={t('workout.myPlan.description')}
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> {t('workout.myPlan.buttonCreateNew')}
          </button>
        }
      />

      {!hasAnything ? (
        <MemberEmptyState
          title={t('workout.myPlan.emptyTitle')}
          description={t('workout.myPlan.emptyDescription')}
          action={
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => navigate('/member/workout/builder')}
            >
              <Dumbbell size={15} /> {t('workout.myPlan.buttonCreatePersonal')}
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* PT assigned */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="rogym-sx-b2fbf853" />
              <h2 className="text-sm font-bold text-white">{t('workout.myPlan.sectionPtPlans')}</h2>
              <span className="text-xs rogym-sx-5e5c39ab">({ptPlans.length})</span>
            </div>
            {ptPlans.length === 0 ? (
              <div className="rounded-[16px] p-5 text-center text-sm rogym-sx-0e44a235">
                {t('workout.myPlan.noPtPlans')}
              </div>
            ) : (
              <div className="space-y-4">
                {ptPlans.map((a) => (
                  <PlanCard
                    key={a.assignmentId}
                    assignment={a}
                    plan={fullPlans.get(a.planId) ?? null}
                    canEdit={false}
                    isPT={true}
                    onDelete={load}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Self built */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <List size={16} className="rogym-sx-f27dac31" />
              <h2 className="text-sm font-bold text-white">{t('workout.myPlan.sectionPersonalPlans')}</h2>
              <span className="text-xs rogym-sx-5e5c39ab">
                ({selfPlans.length + savedPlans.length})
              </span>
            </div>

            {selfPlans.length === 0 && savedPlans.length === 0 ? (
              <div className="rounded-[16px] p-5 text-center text-sm rogym-sx-0e44a235">
                {t('workout.myPlan.noPersonalPlans')}
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary mt-3 mx-auto flex"
                  onClick={() => navigate('/member/workout/builder')}
                >
                  <Dumbbell size={14} /> {t('workout.myPlan.buttonCreateNow')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active self-assigned */}
                {selfPlans.map((a) => (
                  <PlanCard
                    key={a.assignmentId}
                    assignment={a}
                    plan={fullPlans.get(a.planId) ?? null}
                    canEdit={true}
                    isPT={false}
                    onDelete={load}
                  />
                ))}

                {/* Saved (archived) member plans */}
                {savedPlans.map((p) => (
                  <SavedPlanCard
                    key={p.planId}
                    plan={p}
                    hasPtPlan={hasPtPlan}
                    onApply={handleApplySavedPlan}
                    onDelete={load}
                  />
                ))}

                {applyingPlan && (
                  <p className="text-center text-xs rogym-sx-5e5c39ab">{t('workout.myPlan.applying')}</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </MemberPage>
  )
}
