import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
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
import { FilterDropdown } from '@/components/FilterDropdown'
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
import { toast } from '@/lib/toast'

type PlanAction = { type: 'archive' | 'delete'; plan: WorkoutPlan } | null

export default function WorkoutPlansPage() {
  const { t } = useTranslation('trainer')
  const navigate = useNavigate()
  const { data, loading, error, reload } = useTrainerPlans()
  const { data: students } = useTrainerStudents({ pageSize: 100 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null)
  const [memberId, setMemberId] = useState('')
  const [startDate, setStartDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [action, setAction] = useState<PlanAction>(null)
  const [submitting, setSubmitting] = useState(false)
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
    try {
      const plan = await workoutService.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success(t('plans.workout.success.created', { defaultValue: 'Tạo giáo án thành công' }))
      setCreateOpen(false)
      navigate(`/trainer/plans/${plan.planId}/builder`)
    } catch (err) {
      toast.error(getApiError(err, t('plans.workout.error.createFailed')), {
        action: { label: t('common.retry', { defaultValue: 'Thử lại' }), onClick: () => createPlan(event) },
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function activate(plan: WorkoutPlan) {
    const exerciseCount =
      plan.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0
    if (!plan.days?.length || exerciseCount === 0) {
      toast.error(t('plans.workout.error.activateEmpty'))
      return
    }
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      toast.success(t('plans.workout.success.activated', { defaultValue: 'Giáo án đã được kích hoạt' }))
      await reload()
    } catch (err) {
      toast.error(getApiError(err, t('plans.workout.error.activateFailed')))
    }
  }

  async function confirmAction() {
    if (!action) return
    setSubmitting(true)
    try {
      if (action.type === 'archive') {
        await workoutService.updatePlan(action.plan.planId, { status: 'archived' })
      } else {
        await workoutService.deletePlan(action.plan.planId)
      }
      toast.success(action.type === 'archive' 
        ? t('plans.workout.success.archived', { defaultValue: 'Đã lưu trữ giáo án' })
        : t('plans.workout.success.deleted', { defaultValue: 'Đã xóa giáo án' })
      )
      setAction(null)
      await reload()
    } catch (err) {
      toast.error(
        getApiError(
          err,
          action.type === 'archive'
            ? t('plans.workout.error.archiveFailed')
            : t('plans.workout.error.deleteFailed')
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
    try {
      await workoutService.assignPlan(memberId, {
        planId: Number(assignPlan.planId),
        startDate,
        notes: assignNotes.trim() || undefined,
      })
      toast.success(t('plans.workout.success.assigned', { defaultValue: 'Giao giáo án thành công' }))
      navigate(`/trainer/students/${memberId}?tab=workout`)
    } catch (err) {
      toast.error(
        getApiError(err, t('plans.workout.error.assignFailed'))
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
      toast.error(getApiError(err, t('plans.workout.error.loadStudentsFailed')))
    } finally {
      setLoadingExpand(null)
    }
  }

  async function confirmUnassign() {
    if (!unassignTarget) return
    setConfirmingUnassign(true)
    try {
      await workoutService.unassignMember(unassignTarget.assignmentId)
      const planId = unassignTarget.planId
      setPlanAssignments((prev) => ({
        ...prev,
        [planId]: (prev[planId] ?? []).filter(
          (a) => a.assignmentId !== unassignTarget.assignmentId
        ),
      }))
      toast.success(t('plans.workout.success.unassigned', { defaultValue: 'Đã hủy giao giáo án' }))
      setUnassignTarget(null)
    } catch (err) {
      toast.error(getApiError(err, t('plans.workout.error.unassignFailed')))
    } finally {
      setConfirmingUnassign(false)
    }
  }

  const activeCount = status ? 1 : 0

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('plans.workout.eyebrow')}
        title={t('plans.workout.title')}
        description={t('plans.workout.description')}
        actions={
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> {t('plans.workout.createPlan')}
          </Button>
        }
      />
      <div className="rogym-card rogym-card--compact flex items-center gap-3 p-4">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('plans.workout.searchPlaceholder')}
          />
        </div>
        <FilterDropdown
          open={filterOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftStatus(status)
              setFilterOpen(true)
            } else {
              setFilterOpen(false)
            }
          }}
          activeCount={activeCount}
          onApply={() => {
            setStatus(draftStatus)
            setFilterOpen(false)
          }}
          title={t('plans.workout.filterTitle', 'Bộ lọc')}
        >
          <div>
            <p className="rogym-field-label mb-2">{t('plans.workout.fieldStatus', 'Trạng thái')}</p>
            <TrainerSelect value={draftStatus} onValueChange={setDraftStatus}>
              <option value="">{t('plans.workout.allStatuses')}</option>
              <option value="active">{t('plans.workout.statusActive')}</option>
              <option value="archived">{t('plans.workout.statusArchived')}</option>
            </TrainerSelect>
          </div>
        </FilterDropdown>
      </div>
      {error && (
        <TrainerErrorState message={error} onRetry={reload} />
      )}
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : plans.length === 0 ? (
        <TrainerEmptyState
          title={t('plans.workout.noPlan')}
          description={t('plans.workout.noPlanDesc')}
          action={
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
            >
              {t('plans.workout.createPlan')}
            </Button>
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
                      {plan.description ?? t('plans.workout.noDescription')}
                    </p>
                  </div>
                  <TrainerStatusBadge status={plan.status} />
                </div>

                {/* 2 cột trên mobile, 4 cột từ md trở lên */}
                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <Metric value={plan.days?.length ?? 0} label={t('plans.workout.metrics.days')} />
                  <Metric value={exerciseCount} label={t('plans.workout.metrics.exercises')} />
                  <Metric value={plan._count?.assignments ?? 0} label={t('plans.workout.metrics.students')} />
                  <Metric value={formatDate(plan.createdAt)} label={t('plans.workout.metrics.createdAt')} />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {plan.status === 'active' && (
                      <Button
                        variant="primary"
                        onClick={() => {
                          setMemberId('')
                          setAssignNotes('')
                          setAssignPlan(plan)
                        }}
                      >
                        <Send size={15} /> {t('plans.workout.actions.assignStudent')}
                      </Button>
                    )}
                    <Button
                      variant="outline-white"
                      onClick={() => void toggleExpand(plan.planId)}
                      disabled={isLoadingExpand}
                      aria-label={isExpanded ? t('plans.workout.actions.collapseStudents') : t('plans.workout.actions.expandStudents')}
                      data-no-sweep
                    >
                      {isLoadingExpand ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : isExpanded ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonLink
                      variant="outline-white"
                      to={`/trainer/plans/${plan.planId}/builder`}
                    >
                      {plan.status === 'archived' ? (
                        <ClipboardList size={15} />
                      ) : (
                        <Pencil size={15} />
                      )}
                      {plan.status === 'archived' ? t('plans.workout.actions.view') : t('plans.workout.actions.builder')}
                    </ButtonLink>
                    {plan.status === 'draft' && (
                      <Button
                        variant="primary"
                        onClick={() => activate(plan)}
                      >
                        <Zap size={15} /> {t('plans.workout.actions.activate')}
                      </Button>
                    )}
                    {plan.status !== 'archived' && (
                      <Button
                        variant="outline-white"
                        onClick={() => setAction({ type: 'archive', plan })}
                      >
                        <Archive size={15} /> {t('plans.workout.actions.archive')}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => setAction({ type: 'delete', plan })}
                    >
                      <Trash2 size={15} /> {t('plans.workout.actions.delete')}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    {assignments.length === 0 ? (
                      <p className="py-3 text-center text-sm rogym-text-dim">
                        {t('plans.workout.assignments.noStudents')}
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
                                {t('plans.workout.assignments.startedOn', { date: formatDate(a.startDate) })}
                                {a.notes ? ` · ${a.notes}` : ''}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <ButtonLink
                                variant="text"
                                to={`/trainer/students/${a.memberId}`}
                                className="text-xs"
                              >
                                {t('plans.workout.assignments.viewStudent')}
                              </ButtonLink>
                              {a.status === 'active' && (
                                <button
                                  type="button"
                                  className="rogym-inline-action rogym-inline-action--danger rounded-full"
                                  onClick={() => setUnassignTarget(a)}
                                  data-no-sweep
                                >
                                  <UserMinus size={12} /> {t('plans.workout.assignments.unassign')}
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
        title={t('plans.workout.createModal.title')}
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setCreateOpen(false)}
            >
              {t('plans.workout.createModal.cancel')}
            </Button>
            <SubmitButton form="create-plan-form" loading={submitting} disabled={!name.trim()}>
              {t('plans.workout.createModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="create-plan-form" className="space-y-4" onSubmit={createPlan}>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.workout.createModal.fieldName')}</span>
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
            <span className="rogym-field-label">{t('plans.workout.createModal.fieldDescription')}</span>
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
        title={t('plans.workout.assignModal.title', { name: assignPlan?.name ?? '' })}
        onClose={() => setAssignPlan(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setAssignPlan(null)}
            >
              {t('plans.workout.assignModal.cancel')}
            </Button>
            <SubmitButton form="assign-plan-list-form" loading={submitting} disabled={!memberId}>
              {t('plans.workout.assignModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-list-form" className="space-y-4" onSubmit={assign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.workout.assignModal.fieldStudent')}</span>
            <StudentCombobox students={students} value={memberId} onChange={setMemberId} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.workout.assignModal.fieldStartDate')}</span>
            <DatePickerInput value={startDate} onChange={(value) => setStartDate(value)} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('plans.workout.assignModal.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            {t('plans.workout.assignModal.warning')}
          </p>
        </form>
      </TrainerModal>

      {/* Archive / delete confirm modal */}
      <TrainerModal
        open={Boolean(action)}
        title={action?.type === 'delete' ? t('plans.workout.deleteModal.title') : t('plans.workout.archiveModal.title')}
        onClose={() => setAction(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setAction(null)}
            >
              {t('plans.workout.confirmModal.cancel')}
            </Button>
            <Button
              variant={action?.type === 'delete' ? 'danger' : 'primary'}
              onClick={confirmAction}
              disabled={submitting}
            >
              {submitting ? t('plans.workout.confirmModal.submitting') : t('plans.workout.confirmModal.submit')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {action?.type === 'delete'
            ? t('plans.workout.deleteModal.confirm')
            : t('plans.workout.archiveModal.confirm')}
        </p>
      </TrainerModal>

      {/* Unassign confirm modal */}
      <TrainerModal
        open={Boolean(unassignTarget)}
        title={t('plans.workout.unassignModal.title')}
        onClose={() => setUnassignTarget(null)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setUnassignTarget(null)}
            >
              {t('plans.workout.unassignModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmUnassign}
              disabled={confirmingUnassign}
            >
              {confirmingUnassign ? t('plans.workout.unassignModal.submitting') : t('plans.workout.assignments.unassign')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {t('plans.workout.unassignModal.confirm', { name: unassignTarget?.memberName ?? '' })}
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
