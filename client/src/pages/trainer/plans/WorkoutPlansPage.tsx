import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  UserMinus,
  Zap,
} from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { useTrainerPlans } from '@/hooks/useTrainerPlans'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { getApiError } from '@/lib/api-error'
import { formatDate, todayInput } from '@/lib/date'
import workoutService, {
  type PlanAssignment,
  type WorkoutPlan,
} from '@/services/workout.service'
import {
  StudentCombobox,
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

type PlanAction = { type: 'archive' | 'delete'; plan: WorkoutPlan } | null

export default function WorkoutPlansPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useTrainerPlans()
  const { data: students } = useTrainerStudents({ pageSize: 100 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null)
  const [memberId, setMemberId] = useState('')
  const [startDate, setStartDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [action, setAction] = useState<PlanAction>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [planAssignments, setPlanAssignments] = useState<Record<string, PlanAssignment[]>>({})
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)
  const [unassignTarget, setUnassignTarget] = useState<PlanAssignment | null>(null)
  const [confirmingUnassign, setConfirmingUnassign] = useState(false)

  const plans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi')
    return data.filter(
      (plan) =>
        (!status || plan.status === status) &&
        (!query || plan.name.toLocaleLowerCase('vi').includes(query))
    )
  }, [data, search, status])

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setActionError(null)
    try {
      const plan = await workoutService.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setCreateOpen(false)
      navigate(`/trainer/plans/${plan.planId}/builder`)
    } catch (err) {
      setActionError(getApiError(err, 'Không thể tạo kế hoạch tập.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function activate(plan: WorkoutPlan) {
    const exerciseCount =
      plan.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0
    if (!plan.days?.length || exerciseCount === 0) {
      setActionError('Kế hoạch cần ít nhất một ngày và một bài tập trước khi kích hoạt.')
      return
    }
    setActionError(null)
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      await reload()
    } catch (err) {
      setActionError(getApiError(err, 'Không thể kích hoạt kế hoạch.'))
    }
  }

  async function confirmAction() {
    if (!action) return
    setSubmitting(true)
    setActionError(null)
    try {
      if (action.type === 'archive') {
        await workoutService.updatePlan(action.plan.planId, { status: 'archived' })
      } else {
        await workoutService.deletePlan(action.plan.planId)
      }
      setAction(null)
      await reload()
    } catch (err) {
      setActionError(
        getApiError(
          err,
          action.type === 'archive'
            ? 'Không thể lưu trữ kế hoạch khi còn assignment active.'
            : 'Không thể xóa kế hoạch khi còn dữ liệu đang sử dụng.'
        )
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function assign(event: FormEvent) {
    event.preventDefault()
    if (!assignPlan || !memberId) return
    setSubmitting(true)
    setActionError(null)
    try {
      await workoutService.assignPlan(memberId, {
        planId: Number(assignPlan.planId),
        startDate,
        notes: assignNotes.trim() || undefined,
      })
      navigate(`/trainer/students/${memberId}?tab=workout`)
    } catch (err) {
      setActionError(
        getApiError(err, 'Không thể gán kế hoạch. Hãy kiểm tra trạng thái và cấu trúc kế hoạch.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleExpand(planId: string) {
    if (expandedPlan === planId) {
      setExpandedPlan(null)
      return
    }
    if (planAssignments[planId]) {
      setExpandedPlan(planId)
      return
    }
    setLoadingExpand(planId)
    try {
      const fetched = await workoutService.getPlanAssignments(planId)
      setPlanAssignments((prev) => ({ ...prev, [planId]: fetched }))
      setExpandedPlan(planId)
    } catch (err) {
      setActionError(getApiError(err, 'Không thể tải danh sách học viên.'))
    } finally {
      setLoadingExpand(null)
    }
  }

  async function confirmUnassign() {
    if (!unassignTarget) return
    setConfirmingUnassign(true)
    setActionError(null)
    try {
      await workoutService.unassignMember(unassignTarget.assignmentId)
      const planId = unassignTarget.planId
      setPlanAssignments((prev) => ({
        ...prev,
        [planId]: (prev[planId] ?? []).filter(
          (a) => a.assignmentId !== unassignTarget.assignmentId
        ),
      }))
      setUnassignTarget(null)
    } catch (err) {
      setActionError(getApiError(err, 'Không thể gỡ gán.'))
    } finally {
      setConfirmingUnassign(false)
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Workout"
        title="Kế hoạch tập"
        description="Tạo template giáo án, kích hoạt và gán cho học viên của bạn."
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> Tạo kế hoạch
          </button>
        }
      />
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên kế hoạch"
          />
        </div>
        <TrainerSelect value={status} onValueChange={setStatus}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="archived">Lưu trữ</option>
        </TrainerSelect>
      </div>
      {(error || actionError) && (
        <TrainerErrorState message={actionError ?? error!} onRetry={error ? reload : undefined} />
      )}
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : plans.length === 0 ? (
        <TrainerEmptyState
          title="Chưa có kế hoạch tập"
          description="Tạo template đầu tiên để bắt đầu xây dựng giáo án."
          action={
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              Tạo kế hoạch
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => {
            const exerciseCount =
              plan.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0
            const isExpanded = expandedPlan === plan.planId
            const assignments = planAssignments[plan.planId] ?? []
            const isLoadingExpand = loadingExpand === plan.planId
            return (
              <article key={plan.planId} className="rogym-card rogym-card--compact p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 rogym-text-secondary">
                      {plan.description ?? 'Chưa có mô tả.'}
                    </p>
                  </div>
                  <TrainerStatusBadge status={plan.status} />
                </div>

                <div className="mt-5 grid grid-cols-4 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <Metric value={plan.days?.length ?? 0} label="Ngày tập" />
                  <Metric value={exerciseCount} label="Bài tập" />
                  <Metric value={plan._count?.assignments ?? 0} label="Học viên" />
                  <Metric value={formatDate(plan.createdAt)} label="Ngày tạo" />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {plan.status === 'active' && (
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--primary"
                        onClick={() => {
                          setMemberId('')
                          setAssignNotes('')
                          setAssignPlan(plan)
                        }}
                      >
                        <Send size={15} /> Gán học viên
                      </button>
                    )}
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--outline-white"
                      onClick={() => void toggleExpand(plan.planId)}
                      disabled={isLoadingExpand}
                      aria-label={isExpanded ? 'Thu gọn danh sách học viên' : 'Xem học viên được gán'}
                      data-no-sweep
                    >
                      {isLoadingExpand ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : isExpanded ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="rogym-btn rogym-btn--outline-white"
                      to={`/trainer/plans/${plan.planId}/builder`}
                    >
                      {plan.status === 'archived' ? (
                        <ClipboardList size={15} />
                      ) : (
                        <Pencil size={15} />
                      )}
                      {plan.status === 'archived' ? 'Xem' : 'Builder'}
                    </Link>
                    {plan.status === 'draft' && (
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--primary"
                        onClick={() => activate(plan)}
                      >
                        <Zap size={15} /> Kích hoạt
                      </button>
                    )}
                    {plan.status !== 'archived' && (
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--outline-white"
                        onClick={() => setAction({ type: 'archive', plan })}
                      >
                        <Archive size={15} /> Lưu trữ
                      </button>
                    )}
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--danger"
                      onClick={() => setAction({ type: 'delete', plan })}
                    >
                      <Trash2 size={15} /> Xóa
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    {assignments.length === 0 ? (
                      <p className="py-3 text-center text-sm rogym-text-dim">
                        Chưa có học viên nào được gán giáo án này.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {assignments.map((a) => (
                          <div
                            key={a.assignmentId}
                            className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold rogym-text-primary">
                                  {a.memberName}
                                </span>
                                <TrainerStatusBadge status={a.status} />
                              </div>
                              <div className="mt-0.5 text-xs rogym-text-muted">
                                Bắt đầu {formatDate(a.startDate)}
                                {a.notes ? ` · ${a.notes}` : ''}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Link
                                to={`/trainer/students/${a.memberId}`}
                                className="rogym-text-link text-xs"
                              >
                                Xem học viên
                              </Link>
                              {a.status === 'active' && (
                                <button
                                  type="button"
                                  className="rogym-inline-action rogym-inline-action--danger rounded-full"
                                  onClick={() => setUnassignTarget(a)}
                                  data-no-sweep
                                >
                                  <UserMinus size={12} /> Gỡ gán
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Create plan modal */}
      <TrainerModal
        open={createOpen}
        title="Tạo kế hoạch tập"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="create-plan-form" loading={submitting} disabled={!name.trim()}>
              Tạo và mở builder
            </SubmitButton>
          </>
        }
      >
        <form id="create-plan-form" className="space-y-4" onSubmit={createPlan}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên kế hoạch</span>
            <input
              className="rogym-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả</span>
            <textarea
              className="rogym-input min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      {/* Assign student modal */}
      <TrainerModal
        open={Boolean(assignPlan)}
        title={`Gán ${assignPlan?.name ?? 'kế hoạch'}`}
        onClose={() => setAssignPlan(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAssignPlan(null)}
            >
              Hủy
            </button>
            <SubmitButton form="assign-plan-list-form" loading={submitting} disabled={!memberId}>
              Gán kế hoạch
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-list-form" className="space-y-4" onSubmit={assign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Học viên</span>
            <StudentCombobox students={students} value={memberId} onChange={setMemberId} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ngày bắt đầu</span>
            <DatePickerInput value={startDate} onChange={(value) => setStartDate(value)} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            Assignment active hiện tại của học viên sẽ tự động chuyển sang trạng thái đã thay thế.
          </p>
        </form>
      </TrainerModal>

      {/* Archive / delete confirm modal */}
      <TrainerModal
        open={Boolean(action)}
        title={action?.type === 'delete' ? 'Xóa kế hoạch' : 'Lưu trữ kế hoạch'}
        onClose={() => setAction(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAction(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className={
                action?.type === 'delete'
                  ? 'rogym-btn rogym-btn--danger'
                  : 'rogym-btn rogym-btn--primary'
              }
              onClick={confirmAction}
              disabled={submitting}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {action?.type === 'delete'
            ? 'Kế hoạch sẽ bị xóa mềm. Thao tác có thể bị từ chối nếu vẫn còn assignment active hoặc dữ liệu lịch sử liên quan.'
            : 'Kế hoạch lưu trữ sẽ chuyển sang chỉ đọc và không thể kích hoạt lại.'}
        </p>
      </TrainerModal>

      {/* Unassign confirm modal */}
      <TrainerModal
        open={Boolean(unassignTarget)}
        title="Gỡ gán học viên"
        onClose={() => setUnassignTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setUnassignTarget(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              onClick={confirmUnassign}
              disabled={confirmingUnassign}
            >
              {confirmingUnassign ? 'Đang xử lý...' : 'Gỡ gán'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          Gỡ gán sẽ kết thúc assignment active của{' '}
          <span className="font-semibold text-white">{unassignTarget?.memberName}</span>. Dữ liệu
          lịch sử tập luyện vẫn được giữ nguyên.
        </p>
      </TrainerModal>
    </TrainerPage>
  )
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="truncate text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs rogym-text-dim">{label}</div>
    </div>
  )
}
