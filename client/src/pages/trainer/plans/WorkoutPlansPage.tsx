import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserMinus,
  Zap,
} from 'lucide-react'
import { useTrainerPlans } from '@/hooks/useTrainerPlans'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { getApiError } from '@/lib/api-error'
import { formatDate, todayInput } from '@/lib/date'
import workoutService, {
  type PlanAssignment,
  type WorkoutPlan,
} from '@/services/workout.service'
import {
  Page,
  PageHeader,
  PageSkeleton,
  PageEmptyState,
  PageErrorState,
  Card,
  SearchToolbar,
  Select,
  FilterDropdown,
  Button,
  ButtonLink,
  Modal,
  ConfirmDialog,
  FormField,
  Input,
  Textarea,
  DatePickerInput,
  StatusBadge,
} from '@/components/ui'
import { StudentCombobox } from '@/components/TrainerUI'
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
      toast.success(
        action.type === 'archive'
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
      toast.error(getApiError(err, t('plans.workout.error.assignFailed')))
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
    <Page>
      <PageHeader
        eyebrow={t('plans.workout.eyebrow')}
        title={t('plans.workout.title')}
        description={t('plans.workout.description')}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> {t('plans.workout.createPlan')}
          </Button>
        }
      />
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={t('plans.workout.searchPlaceholder')}
        layout="row"
        filters={
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
            onClear={() => {
              setDraftStatus('')
              setStatus('')
              setFilterOpen(false)
            }}
            title={t('plans.workout.filterTitle', 'Bộ lọc')}
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                {t('plans.workout.fieldStatus', 'Trạng thái')}
              </p>
              <Select value={draftStatus} onValueChange={setDraftStatus}>
                <option value="">{t('plans.workout.allStatuses')}</option>
                <option value="active">{t('plans.workout.statusActive')}</option>
                <option value="archived">{t('plans.workout.statusArchived')}</option>
              </Select>
            </div>
          </FilterDropdown>
        }
      />

      {error && <PageErrorState message={error} onRetry={reload} />}

      {loading ? (
        <PageSkeleton rows={5} />
      ) : plans.length === 0 ? (
        <PageEmptyState
          title={t('plans.workout.noPlan')}
          description={t('plans.workout.noPlanDesc')}
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
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
              <Card key={plan.planId} variant="compact" className="p-4 sm:p-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-white">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 rogym-text-secondary">
                      {plan.description ?? t('plans.workout.noDescription')}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={plan.status} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center sm:gap-3 sm:p-4 md:grid-cols-4">
                  <Metric value={plan.days?.length ?? 0} label={t('plans.workout.metrics.days')} />
                  <Metric value={exerciseCount} label={t('plans.workout.metrics.exercises')} />
                  <Metric value={plan._count?.assignments ?? 0} label={t('plans.workout.metrics.students')} />
                  <Metric value={formatDate(plan.createdAt)} label={t('plans.workout.metrics.createdAt')} />
                </div>

                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="contents sm:flex sm:items-center sm:gap-2">
                    {plan.status === 'active' && (
                      <Button
                        variant="primary"
                        className="w-full sm:w-auto"
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
                      size="compact"
                      onClick={() => void toggleExpand(plan.planId)}
                      disabled={isLoadingExpand}
                      aria-label={
                        isExpanded
                          ? t('plans.workout.actions.collapseStudents')
                          : t('plans.workout.actions.expandStudents')
                      }
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

                  <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <ButtonLink
                      variant="outline-white"
                      size="compact"
                      className="w-full sm:w-auto"
                      to={`/trainer/plans/${plan.planId}/builder`}
                    >
                      {plan.status === 'archived' ? (
                        <ClipboardList size={15} />
                      ) : (
                        <Pencil size={15} />
                      )}
                      {plan.status === 'archived'
                        ? t('plans.workout.actions.view')
                        : t('plans.workout.actions.builder')}
                    </ButtonLink>
                    {plan.status === 'draft' && (
                      <Button
                        variant="primary"
                        size="compact"
                        className="w-full sm:w-auto"
                        onClick={() => activate(plan)}
                      >
                        <Zap size={15} /> {t('plans.workout.actions.activate')}
                      </Button>
                    )}
                    {plan.status !== 'archived' && (
                      <Button
                        variant="outline-white"
                        size="compact"
                        className="w-full sm:w-auto"
                        onClick={() => setAction({ type: 'archive', plan })}
                      >
                        <Archive size={15} /> {t('plans.workout.actions.archive')}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="compact"
                      className="col-span-2 w-full sm:col-auto sm:w-auto"
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
                            className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                          >
                            <div className="min-w-0 w-full flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 truncate font-semibold text-white">
                                  {a.memberName}
                                </span>
                                <span className="shrink-0">
                                  <StatusBadge status={a.status} />
                                </span>
                              </div>
                              <div className="mt-0.5 text-xs rogym-text-muted">
                                {t('plans.workout.assignments.startedOn', {
                                  date: formatDate(a.startDate),
                                })}
                                {a.notes ? ` · ${a.notes}` : ''}
                              </div>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
                              <ButtonLink
                                variant="outline-white"
                                size="compact"
                                to={`/trainer/students/${a.memberId}`}
                                className={`w-full justify-center sm:hidden${a.status !== 'active' ? ' col-span-2' : ''}`}
                              >
                                {t('plans.workout.assignments.viewStudent')}
                              </ButtonLink>
                              <ButtonLink
                                variant="text-accent"
                                size="compact"
                                to={`/trainer/students/${a.memberId}`}
                                className="hidden sm:inline-flex"
                              >
                                {t('plans.workout.assignments.viewStudent')}
                              </ButtonLink>
                              {a.status === 'active' && (
                                <Button
                                  variant="danger"
                                  size="compact"
                                  onClick={() => setUnassignTarget(a)}
                                >
                                  <UserMinus size={12} /> {t('plans.workout.assignments.unassign')}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create plan modal */}
      <Modal
        open={createOpen}
        title={t('plans.workout.createModal.title')}
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="outline-white" onClick={() => setCreateOpen(false)}>
              {t('plans.workout.createModal.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-plan-form"
              loading={submitting}
              disabled={!name.trim()}
            >
              {t('plans.workout.createModal.submit')}
            </Button>
          </>
        }
      >
        <form id="create-plan-form" className="space-y-4" onSubmit={createPlan}>
          <FormField label={t('plans.workout.createModal.fieldName')} required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </FormField>
          <FormField label={t('plans.workout.createModal.fieldDescription')}>
            <Textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
        </form>
      </Modal>

      {/* Assign student modal */}
      <Modal
        open={Boolean(assignPlan)}
        title={t('plans.workout.assignModal.title', { name: assignPlan?.name ?? '' })}
        onClose={() => setAssignPlan(null)}
        footer={
          <>
            <Button variant="outline-white" onClick={() => setAssignPlan(null)}>
              {t('plans.workout.assignModal.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="assign-plan-list-form"
              loading={submitting}
              disabled={!memberId}
            >
              {t('plans.workout.assignModal.submit')}
            </Button>
          </>
        }
      >
        <form id="assign-plan-list-form" className="space-y-4" onSubmit={assign}>
          <FormField label={t('plans.workout.assignModal.fieldStudent')} required>
            <StudentCombobox students={students} value={memberId} onChange={setMemberId} />
          </FormField>
          <FormField label={t('plans.workout.assignModal.fieldStartDate')} required>
            <DatePickerInput value={startDate} onChange={(value) => setStartDate(value)} />
          </FormField>
          <FormField label={t('plans.workout.assignModal.fieldNotes')}>
            <Textarea
              rows={3}
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </FormField>
          <p className="text-xs leading-5 text-amber-200">
            {t('plans.workout.assignModal.warning')}
          </p>
        </form>
      </Modal>

      {/* Archive / delete confirm dialog */}
      {action && (
        <ConfirmDialog
          open={Boolean(action)}
          title={
            action.type === 'delete'
              ? t('plans.workout.deleteModal.title')
              : t('plans.workout.archiveModal.title')
          }
          variant={action.type === 'delete' ? 'danger' : 'primary'}
          loading={submitting}
          onClose={() => setAction(null)}
          onConfirm={confirmAction}
          description={
            action.type === 'delete'
              ? t('plans.workout.deleteModal.confirm')
              : t('plans.workout.archiveModal.confirm')
          }
          confirmLabel={
            action.type === 'delete'
              ? t('plans.workout.actions.delete')
              : t('plans.workout.actions.archive')
          }
        />
      )}

      {/* Unassign confirm dialog */}
      {unassignTarget && (
        <ConfirmDialog
          open={Boolean(unassignTarget)}
          title={t('plans.workout.unassignModal.title')}
          variant="danger"
          loading={confirmingUnassign}
          onClose={() => setUnassignTarget(null)}
          onConfirm={confirmUnassign}
          description={t('plans.workout.unassignModal.confirm', {
            name: unassignTarget.memberName ?? '',
          })}
          confirmLabel={t('plans.workout.assignments.unassign')}
        />
      )}
    </Page>
  )
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs rogym-text-dim">{label}</div>
    </div>
  )
}
