import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  CheckCircle,
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

// ── Active plan card (assignments) ────────────────────────────────────────────

function PlanCard({
  assignment,
  plan,
  canEdit,
  isPT,
  onDelete,
  onUnassignSelf,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  canEdit: boolean
  isPT: boolean
  onDelete: () => void
  onUnassignSelf?: () => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [detailDay, setDetailDay] = useState<WorkoutPlanDay | null>(null)
  const [doneConfirm, setDoneConfirm] = useState(false)
  const [doneLoading, setDoneLoading] = useState(false)

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
      setDeleteError('Không thể xóa kế hoạch.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDonePt() {
    setDoneLoading(true)
    try {
      await workoutService.unassignMember(assignment.assignmentId)
      setDoneConfirm(false)
      onUnassignSelf?.()
    } catch {
      setDoneLoading(false)
    }
  }

  return (
    <div className={`rogym-plan-card rogym-card rogym-card--md ${isPT ? 'is-trainer-plan' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`rogym-plan-source rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPT ? 'is-trainer-plan' : ''
                }`}
              >
                {isPT ? 'PT giao' : 'Cá nhân'}
              </span>
              <h3 className="truncate font-bold text-white">
                {assignment.plan?.name ?? plan?.name ?? '—'}
              </h3>
            </div>
            {plan?.description && (
              <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>
            )}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> ngày
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> bài tập
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> phút/ngày (ước
                  tính)
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
            <span className="flex-1 text-xs text-red-200">Xóa kế hoạch này?</span>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
              onClick={() => setDeleteConfirm(false)}
            >
              Hủy
            </button>
          </div>
        )}
        {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}

        {/* "Đã tập xong" for PT plans */}
        {isPT && onUnassignSelf && (
          <div className="mt-3">
            {doneConfirm ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <span className="flex-1 text-xs text-amber-200">
                  Xác nhận đã hoàn thành kế hoạch PT này?
                </span>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary px-3 py-1 text-xs"
                  disabled={doneLoading}
                  onClick={() => void handleDonePt()}
                >
                  {doneLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
                  onClick={() => setDoneConfirm(false)}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="rogym-text-link rogym-text-link--accent flex items-center gap-1 text-xs"
                onClick={() => setDoneConfirm(true)}
              >
                <CheckCircle size={13} /> Đã tập xong
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết ngày tập'}
        </button>
      </div>

      {expanded && plan?.days && (
        <div className="rogym-sx-8553bf9e">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div
                key={day.planDayId}
                className="flex items-center justify-between px-5 py-3 rogym-sx-6720cca7"
              >
                <div>
                  <p className="text-sm font-medium text-white">{day.name}</p>
                  <p className="text-xs rogym-sx-5e5c39ab">{day.exercises?.length ?? 0} bài tập</p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs"
                  onClick={() => setDetailDay(day)}
                >
                  Chi tiết
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
                  {detailDay.exercises?.length ?? 0} bài tập
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
                          {ex.exercise?.name ?? 'Bài tập'}
                        </p>
                        <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">
                          {ex.targetSets} sets ·{' '}
                          {isCardio
                            ? `${ex.targetDurationSec ?? 0} giây`
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
                {isArchived ? 'Đã lưu trữ' : plan.status === 'draft' ? 'Nháp' : 'Tạm dừng'}
              </span>
              <h3 className="truncate font-bold text-white">{plan.name}</h3>
            </div>
            {plan.description && (
              <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>
            )}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> ngày
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> bài tập
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> phút/ngày (ước
                  tính)
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
                Áp dụng
              </button>
            )}
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs"
              onClick={() => navigate(`/member/workout/builder/${plan.planId}`)}
            >
              {isArchived ? (
                <>
                  <Eye size={13} /> Xem
                </>
              ) : (
                <>
                  <Pencil size={13} /> Sửa
                </>
              )}
            </button>
            {!deleteConfirm && (
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
            <span className="flex-1 text-xs text-red-200">Xóa kế hoạch đã lưu này?</span>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
              onClick={() => setDeleteConfirm(false)}
            >
              Hủy
            </button>
          </div>
        )}

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết ngày tập'}
        </button>
      </div>

      {expanded && plan.days && (
        <div className="rogym-sx-8553bf9e">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div key={day.planDayId} className="px-5 py-3 rogym-sx-6720cca7">
                <p className="text-sm font-medium text-white">{day.name}</p>
                <p className="text-xs rogym-sx-5e5c39ab">{day.exercises?.length ?? 0} bài tập</p>
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
      setError('Không thể tải kế hoạch tập.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

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
        <MemberPageHeader eyebrow="Kế hoạch tập" title="Kế hoạch của tôi" />
        <MemberSkeleton rows={6} />
      </MemberPage>
    )

  if (error)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow="Kế hoạch tập" title="Kế hoạch của tôi" />
        <MemberErrorState message={error} onRetry={load} />
      </MemberPage>
    )

  const hasAnything = activeAssignments.length > 0 || savedPlans.length > 0

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Kế hoạch tập"
        title="Kế hoạch của tôi"
        description="Kế hoạch từ PT và kế hoạch tự xây dựng của bạn"
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> Tạo plan mới
          </button>
        }
      />

      {!hasAnything ? (
        <MemberEmptyState
          title="Bạn chưa có kế hoạch tập"
          description="Tạo kế hoạch cá nhân hoặc liên hệ PT để được giao kế hoạch phù hợp."
          action={
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => navigate('/member/workout/builder')}
            >
              <Dumbbell size={15} /> Tạo plan cá nhân
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* PT assigned */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="rogym-sx-b2fbf853" />
              <h2 className="text-sm font-bold text-white">Do PT giao</h2>
              <span className="text-xs rogym-sx-5e5c39ab">({ptPlans.length})</span>
            </div>
            {ptPlans.length === 0 ? (
              <div className="rounded-[16px] p-5 text-center text-sm rogym-sx-0e44a235">
                Liên hệ PT để được giao kế hoạch phù hợp. 
                Trong lúc đợi, bạn có thể tạo và sử dụng kế hoạch riêng.
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
                    onUnassignSelf={load}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Self built */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <List size={16} className="rogym-sx-f27dac31" />
              <h2 className="text-sm font-bold text-white">Kế hoạch cá nhân</h2>
              <span className="text-xs rogym-sx-5e5c39ab">
                ({selfPlans.length + savedPlans.length})
              </span>
            </div>

            {selfPlans.length === 0 && savedPlans.length === 0 ? (
              <div className="rounded-[16px] p-5 text-center text-sm rogym-sx-0e44a235">
                Chưa có kế hoạch tự xây dựng.
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary mt-3 mx-auto flex"
                  onClick={() => navigate('/member/workout/builder')}
                >
                  <Dumbbell size={14} /> Tạo ngay
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
                  <p className="text-center text-xs rogym-sx-5e5c39ab">Đang áp dụng kế hoạch...</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </MemberPage>
  )
}
