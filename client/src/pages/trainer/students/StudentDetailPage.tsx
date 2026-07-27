import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { SessionDetailModal } from '@/components/trainer/SessionDetailModal'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ArrowLeft, CalendarPlus, ClipboardList, Plus, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getApiError } from '@/lib/api-error'
import { formatDate, formatDateTime, todayInput } from '@/lib/date'
import {
  memberService,
  type MemberProgress,
  type TrainerStudentDetail,
} from '@/services/member.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
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
import { PageLoader } from '@/components/shared/Spinner'

type Tab = 'overview' | 'sessions' | 'workout'

const StudentProgressChart = lazy(() => import('@/components/charts/StudentProgressChart'))

export default function StudentDetailPage() {
  const { t } = useTranslation('trainer')
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'overview'
  const [student, setStudent] = useState<TrainerStudentDetail | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress[]>([])
  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignDate, setAssignDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentData, sessionResult, progressData, assignmentData, planData] =
        await Promise.all([
          memberService.getById(id),
          trainingService.getSessions({ memberId: id, pageSize: 100, sort: 'start_time:desc' }),
          memberService.getProgress(id, { limit: 100 }),
          workoutService.getAssignments(id, { limit: 20 }),
          workoutService.getPlans(),
        ])
      setStudent(studentData)
      setSessions(sessionResult.data)
      setProgress(progressData)
      setAssignments(assignmentData)
      setPlans(planData.filter((plan) => plan.status === 'active'))
      const firstActive = assignmentData.find((item) => item.status === 'active')
      setActivePlan(firstActive ? await workoutService.getPlan(firstActive.planId) : null)
    } catch (err) {
      setError(getApiError(err, t('students.detail.error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = useMemo(
    () =>
      [...progress].reverse().map((item) => ({
        date: formatDate(item.recordedAt),
        weight: item.weight ? Number(item.weight) : null,
        bmi: item.bmi ? Number(item.bmi) : null,
      })),
    [progress]
  )
  const activeSubscription = useMemo(
    () => student?.subscriptions.find((item) => item.status === 'active') ?? null,
    [student?.subscriptions]
  )
  const upcomingSession = useMemo(() => {
    const now = Date.now()
    return sessions.reduce<TrainingSession | undefined>((next, item) => {
      if (item.status !== 'scheduled') return next
      const startTime = new Date(item.startTime).getTime()
      if (startTime <= now) return next
      if (!next || startTime < new Date(next.startTime).getTime()) return item
      return next
    }, undefined)
  }, [sessions])
  const assignmentHistory = useMemo(
    () => assignments.filter((item) => item.status !== 'active'),
    [assignments]
  )
  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.status === 'active'),
    [assignments]
  )
  const latestProgress = progress[0]

  function selectTab(nextTab: Tab) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next)
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault()
    if (!assignPlanId) return
    setAssigning(true)
    setError(null)
    try {
      await workoutService.assignPlan(id, {
        planId: Number(assignPlanId),
        startDate: assignDate,
        notes: assignNotes.trim() || undefined,
      })
      setAssignOpen(false)
      setAssignNotes('')
      await load()
      selectTab('workout')
    } catch (err) {
      setError(getApiError(err, t('students.detail.error.assignFailed')))
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign() {
    const target = activeAssignments[0]
    if (!target) return
    setUnassigning(true)
    try {
      await workoutService.unassignMember(target.assignmentId)
      setUnassignOpen(false)
      await load()
    } catch (err) {
      setError(getApiError(err, t('students.detail.error.unassignFailed')))
    } finally {
      setUnassigning(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={6} />
      </TrainerPage>
    )
  if (error && !student)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!student) return null

  return (
    <TrainerPage>
      <ButtonLink
        variant="text"
        to="/trainer/students"
        className="mb-1 inline-flex items-center gap-1.5 text-xs rogym-text-dim hover:rogym-text-secondary"
      >
        <ArrowLeft size={13} /> {t('students.detail.backToList')}
      </ButtonLink>
      <TrainerPageHeader
        eyebrow={student.memberCode}
        title={student.fullName}
        description={`${student.email} · ${student.phone ?? t('students.detail.profile.noPhone')}`}
        actions={
          <>
            <ButtonLink
              variant="outline-white"
              to={`/trainer/sessions/create?memberId=${id}`}
            >
              <CalendarPlus size={16} /> {t('students.detail.createSession')}
            </ButtonLink>
            <ButtonLink variant="primary" to={`/trainer/students/${id}/progress`}>
              <TrendingUp size={16} /> {t('students.detail.recordProgress')}
            </ButtonLink>
          </>
        }
      />
      {error && <TrainerErrorState message={error} onRetry={load} />}

      <div className="flex gap-2 overflow-x-auto border-b border-white/5 pb-3">
        {(
          [
            ['overview', t('students.detail.tabs.overview')],
            ['sessions', t('students.detail.tabs.sessions')],
            ['workout', t('students.detail.tabs.workout')],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'primary' : 'outline-white'}
            className="whitespace-nowrap"
            onClick={() => selectTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">{t('students.detail.profile.title')}</h2>
            <Info label={t('students.detail.profile.memberCode')} value={student.memberCode} />
            <Info label={t('students.detail.profile.email')} value={student.email} />
            <Info label={t('students.detail.profile.phone')} value={student.phone ?? t('students.detail.profile.noPhone')} />
            <Info label={t('students.detail.profile.dob')} value={formatDate(student.dateOfBirth)} />
            <Info label={t('students.detail.profile.address')} value={student.address ?? t('students.detail.profile.noAddress')} />
          </section>

          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">{t('students.detail.training.title')}</h2>
            <Info
              label={t('students.detail.training.currentPackage')}
              value={activeSubscription?.packageName ?? t('students.detail.training.noPackage')}
            />
            <Info label={t('students.detail.training.expiry')} value={formatDate(activeSubscription?.endDate)} />
            <Info label={t('students.detail.training.nextSession')} value={formatDateTime(upcomingSession?.startTime)} />
            <Info
              label={t('students.detail.training.latestWeight')}
              value={
                latestProgress?.weight
                  ? `${Number(latestProgress.weight).toFixed(1)} kg`
                  : t('students.detail.training.noWeight')
              }
            />
            <Info label={t('students.detail.training.goal')} value={latestProgress?.goal ?? t('students.detail.training.noGoal')} />
          </section>

          {activeAssignments.map((assignment) => (
            <section
              key={assignment.assignmentId}
              className="rogym-card rogym-card--compact relative p-6 lg:col-span-2"
            >
              <span
                className={`absolute right-5 top-5 rounded-full border px-3 py-1 text-xs font-medium ${
                  assignment.assignedByStaffId
                    ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                    : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                }`}
              >
                {assignment.assignedByStaffId
                  ? t('students.detail.plan.ptAssigned')
                  : t('students.detail.plan.personal')}
              </span>
              <h2 className="mb-2 pr-28 text-lg font-bold text-white">
                {assignment.plan?.name ?? t('students.detail.plan.notFound')}
              </h2>
              <p className="mb-4 text-sm rogym-text-secondary">
                {assignment.plan?.description ?? t('students.detail.plan.noDescription')}
              </p>
              <Button
                variant="text"
                className="text-xs"
                onClick={() => selectTab('workout')}
              >
                {t('students.detail.workout.detail')}
              </Button>
            </section>
          ))}

          <section className="rogym-card rogym-card--compact p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t('students.detail.progress.title')}</h2>
              <ButtonLink
                variant="primary"
                to={`/trainer/students/${id}/progress`}
              >
                <Plus size={15} /> {t('students.detail.progress.addNew')}
              </ButtonLink>
            </div>
            {progress.length === 0 ? (
              <p className="text-sm rogym-text-secondary">{t('students.detail.progress.noData')}</p>
            ) : (
              <div className="h-64">
                <Suspense fallback={<PageLoader minHeight="100%" />}>
                  <StudentProgressChart data={chartData} />
                </Suspense>
              </div>
            )}
          </section>

          {progress.length > 0 && (
            <section className="rogym-card rogym-card--compact p-5 lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-white">{t('students.detail.progress.historyTitle')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-2 text-left text-xs font-medium rogym-text-dim">{t('students.detail.progress.colDate')}</th>
                      <th className="pb-2 text-right text-xs font-medium rogym-text-dim">{t('students.detail.progress.colWeight')}</th>
                      <th className="pb-2 text-right text-xs font-medium rogym-text-dim">{t('students.detail.progress.colBmi')}</th>
                      <th className="pb-2 pl-4 text-left text-xs font-medium rogym-text-dim">{t('students.detail.progress.colGoal')}</th>
                      <th className="pb-2 pl-4 text-left text-xs font-medium rogym-text-dim">{t('students.detail.progress.colNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((item) => (
                      <tr key={item.progressId} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 text-white">{formatDate(item.recordedAt)}</td>
                        <td className="py-2.5 text-right text-white">
                          {item.weight ? `${Number(item.weight).toFixed(1)} kg` : '—'}
                        </td>
                        <td className="py-2.5 text-right text-white">
                          {item.bmi ? Number(item.bmi).toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 pl-4 rogym-text-secondary">
                          {item.goal ?? '—'}
                        </td>
                        <td className="py-2.5 pl-4 rogym-text-secondary">
                          {item.notes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'sessions' &&
        (sessions.length === 0 ? (
          <TrainerEmptyState
            title={t('students.detail.sessions.noSessions')}
            action={
              <ButtonLink
                variant="primary"
                to={`/trainer/sessions/create?memberId=${id}`}
              >
                {t('students.detail.sessions.createFirst')}
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => setOpenedSessionId(session.sessionId)}
                className="rogym-card rogym-card--compact flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div>
                  <div className="font-semibold text-white">
                    {formatDateTime(session.startTime)}
                  </div>
                  <div className="mt-1 text-sm rogym-text-secondary">
                    {session.roomName ?? t('students.detail.sessions.noRoom')}
                  </div>
                </div>
                <TrainerStatusBadge status={session.status} />
              </button>
            ))}
          </div>
        ))}

      {tab === 'workout' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setAssignOpen(true)}
            >
              <ClipboardList size={16} /> {t('students.detail.workout.assignNew')}
            </Button>
          </div>
          {!activePlan ? (
            <TrainerEmptyState
              title={t('students.detail.workout.noActivePlan')}
              description={t('students.detail.workout.noActivePlanDesc')}
            />
          ) : (
            <section className="rogym-card rogym-card--compact p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{activePlan.name}</h2>
                  <p className="mt-2 text-sm rogym-text-secondary">
                    {activePlan.description ?? t('students.detail.plan.noDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {activeAssignments[0] && (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        activeAssignments[0].assignedByStaffId
                          ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                          : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                      }`}
                    >
                      {activeAssignments[0].assignedByStaffId
                        ? t('students.detail.plan.ptAssigned')
                        : t('students.detail.plan.personal')}
                    </span>
                  )}
                  {activeAssignments[0]?.assignedByStaffId && (
                    <Button
                      variant="danger"
                      className="rounded-full"
                      onClick={() => setUnassignOpen(true)}
                    >
                      {t('students.detail.workout.unassign')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {activePlan.days?.map((day) => (
                  <div
                    key={day.planDayId}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <div className="font-semibold text-white">
                      {day.dayNumber}. {day.name}
                    </div>
                    <div className="mt-3 space-y-2">
                      {day.exercises?.map((item) => (
                        <div
                          key={item.planExerciseId}
                          className="rounded-xl bg-black/15 p-3 text-sm"
                        >
                          <div className="font-medium text-white">
                            {item.exercise?.name ?? t('plans.builder.editExerciseModal.defaultName')}
                          </div>
                          <div className="mt-1 text-xs rogym-text-dim">
                            {item.targetSets} sets ·{' '}
                            {item.targetReps
                              ? `${item.targetReps} reps`
                              : `${item.targetDurationSec ?? 0}s`}
                            {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)}kg` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {assignmentHistory.length > 0 && (
            <section className="rogym-card rogym-card--compact p-6">
              <h2 className="mb-4 text-lg font-bold text-white">{t('students.detail.workout.historyTitle')}</h2>
              <div className="space-y-3">
                {assignmentHistory.map((item) => (
                  <div
                    key={item.assignmentId}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {item.plan?.name ?? t('students.detail.plan.notFound')}
                      </div>
                      <div className="text-xs rogym-text-dim">
                        {t('students.detail.workout.startedOn', { date: formatDate(item.startDate) })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          item.assignedByStaffId
                            ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
                            : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                        }`}
                      >
                        {item.assignedByStaffId
                          ? t('students.detail.plan.ptAssigned')
                          : t('students.detail.plan.personal')}
                      </span>
                      <TrainerStatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <TrainerModal
        open={assignOpen}
        title={t('students.detail.assignModal.title')}
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setAssignOpen(false)}
            >
              {t('students.detail.assignModal.cancel')}
            </Button>
            <SubmitButton form="assign-plan-form" loading={assigning} disabled={!assignPlanId}>
              {t('students.detail.assignModal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-form" className="space-y-4" onSubmit={handleAssign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('students.detail.assignModal.fieldPlan')}</span>
            <TrainerSelect value={assignPlanId} onValueChange={setAssignPlanId} required>
              <option value="">{t('students.detail.assignModal.selectPlan')}</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.name}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('students.detail.assignModal.fieldStartDate')}</span>
            <DatePickerInput value={assignDate} onChange={(value) => setAssignDate(value)} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('students.detail.assignModal.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            {t('students.detail.assignModal.warning')}
          </p>
          <button type="submit" className="hidden" />
        </form>
      </TrainerModal>

      <TrainerModal
        open={unassignOpen}
        title={t('students.detail.unassignModal.title')}
        onClose={() => setUnassignOpen(false)}
        footer={
          <>
            <Button
              variant="outline-white"
              onClick={() => setUnassignOpen(false)}
              disabled={unassigning}
            >
              {t('students.detail.unassignModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleUnassign}
              disabled={unassigning}
            >
              {unassigning
                ? t('students.detail.unassignModal.submitting')
                : t('students.detail.unassignModal.submit')}
            </Button>
          </>
        }
      >
        <p className="text-sm rogym-text-secondary">
          {t('students.detail.unassignModal.confirm', { name: activePlan?.name ?? '' })}
        </p>
      </TrainerModal>

      <SessionDetailModal
        sessionId={openedSessionId}
        onClose={() => setOpenedSessionId(null)}
        onUpdate={load}
      />
    </TrainerPage>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm rogym-text-dim">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  )
}
