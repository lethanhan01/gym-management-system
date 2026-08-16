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
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Modal,
} from '@/components/ui'
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
import { cn } from '@/lib/utils'

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
    try {
      await workoutService.deletePlan(plan.planId)
      setDeleteConfirm(false)
      onDelete()
    } catch {
      // deletion error handled silently/by query refresh
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card variant="compact" className={cn('p-5', isPT ? 'is-trainer-plan border-[var(--rogym-green)]/20' : '')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start gap-2">
            <Badge tone={isPT ? 'success' : 'accent'} size="xs">
              {isPT ? t('workout.myPlan.sourceTrainer') : t('workout.myPlan.sourcePersonal')}
            </Badge>
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
          <Button
            variant="icon"
            size="sm"
            onClick={() => navigate('/member/workout/create-session')}
            aria-label="Tạo buổi tập"
            title="Tạo buổi tập"
          >
            <Play size={14} />
          </Button>
          {canEdit && (
            <Button
              variant="icon"
              size="sm"
              onClick={() => navigate(`/member/workout/builder/${assignment.planId}`)}
              aria-label="Sửa plan"
              title="Sửa plan"
            >
              <Pencil size={14} />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="icon"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
              aria-label="Xóa plan"
              title="Xóa plan"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="text-accent"
        size="xs"
        className="mt-3"
        leftIcon={expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? t('workout.myPlan.buttonHideDetail') : t('workout.myPlan.buttonShowDetail')}
      </Button>

      {expanded && plan?.days && (
        <div className="rogym-sx-8553bf9e mt-3">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div
                key={day.planDayId}
                className="flex items-center justify-between gap-3 px-3 py-3 rogym-sx-6720cca7"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white">{day.name}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">{t('workout.myPlan.exerciseCount', { count: day.exercises?.length ?? 0 })}</p>
                </div>
                <Button
                  variant="icon"
                  size="xs"
                  onClick={() => setDetailDay(day)}
                  aria-label={t('workout.myPlan.buttonDayDetailAria', { name: day.name })}
                  title={t('workout.myPlan.buttonDayDetailAria', { name: day.name })}
                >
                  <Eye size={14} />
                </Button>
              </div>
            ))}
        </div>
      )}

      {detailDay && (
        <Modal
          open={Boolean(detailDay)}
          title={detailDay.name}
          size="md"
          onClose={() => setDetailDay(null)}
        >
          <div>
            <p className="mb-4 text-xs rogym-text-secondary">
              {t('workout.myPlan.exerciseCount', { count: detailDay.exercises?.length ?? 0 })}
            </p>
            <div className="space-y-2">
              {[...(detailDay.exercises ?? [])]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((ex, i) => {
                  const isCardio = ex.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
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
        </Modal>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title={t('workout.myPlan.buttonDeletePlan')}
        description={t('workout.myPlan.deleteSavedConfirm')}
        variant="danger"
        loading={deleting}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
      />
    </Card>
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
      // handled
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card variant="compact" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone="muted" size="xs" leftIcon={<Archive size={10} />}>
              {isArchived
                ? t('workout.myPlan.savedPlanArchived')
                : plan.status === 'draft'
                  ? t('workout.myPlan.savedPlanDraft')
                  : t('workout.myPlan.savedPlanPaused')}
            </Badge>
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

        <div className="flex shrink-0 items-center gap-1.5 flex-wrap justify-end">
          {!hasPtPlan && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => onApply(plan)}
            >
              {t('workout.myPlan.buttonApply')}
            </Button>
          )}
          {isArchived ? (
            <Button
              variant="outline-white"
              size="xs"
              leftIcon={<Eye size={13} />}
              onClick={() => navigate(`/member/workout/builder/${plan.planId}`)}
            >
              {t('workout.myPlan.buttonView')}
            </Button>
          ) : (
            <Button
              variant="icon"
              size="sm"
              onClick={() => navigate(`/member/workout/builder/${plan.planId}`)}
              aria-label="Sửa plan"
              title="Sửa plan"
            >
              <Pencil size={14} />
            </Button>
          )}
          <Button
            variant="icon"
            size="sm"
            onClick={() => setDeleteConfirm(true)}
            aria-label={t('workout.myPlan.buttonDelete')}
            title={t('workout.myPlan.buttonDelete')}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Button
        variant="text-accent"
        size="xs"
        className="mt-3"
        leftIcon={expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? t('workout.myPlan.buttonHideDetail') : t('workout.myPlan.buttonShowDetail')}
      </Button>

      {expanded && plan.days && (
        <div className="rogym-sx-8553bf9e mt-3">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div key={day.planDayId} className="px-3 py-3 rogym-sx-6720cca7">
                <p className="text-sm font-medium text-white">{day.name}</p>
                <p className="text-xs rogym-sx-5e5c39ab">{t('workout.myPlan.exerciseCount', { count: day.exercises?.length ?? 0 })}</p>
                {[...(day.exercises ?? [])]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((ex, i) => {
                    const isCardio = ex.exercise?.bodyPart?.name?.toLowerCase() === 'cardio'
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

      <ConfirmDialog
        open={deleteConfirm}
        title={t('workout.myPlan.buttonDelete')}
        description={t('workout.myPlan.deleteSavedConfirm')}
        variant="danger"
        loading={deleting}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
      />
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyPlanPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('member')
  const user = useAuthStore((state) => state.user)
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
          <Button
            variant="primary"
            leftIcon={<Dumbbell size={15} />}
            onClick={() => navigate('/member/workout/builder')}
          >
            {t('workout.myPlan.buttonCreateNew')}
          </Button>
        }
      />

      {!hasAnything ? (
        <MemberEmptyState
          title={t('workout.myPlan.emptyTitle')}
          description={t('workout.myPlan.emptyDescription')}
          action={
            <Button
              variant="primary"
              leftIcon={<Dumbbell size={15} />}
              onClick={() => navigate('/member/workout/builder')}
            >
              {t('workout.myPlan.buttonCreatePersonal')}
            </Button>
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
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3 mx-auto flex"
                  leftIcon={<Dumbbell size={14} />}
                  onClick={() => navigate('/member/workout/builder')}
                >
                  {t('workout.myPlan.buttonCreateNow')}
                </Button>
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

