import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Clock, Dumbbell, Pencil, Play } from 'lucide-react'
import {
  MemberCard,
  MemberEmptyState,
  MemberErrorState,
  MemberSkeleton,
} from '@/components/MemberUI'
import { Button, CardTitle } from '@/components/ui'
import type {
  WorkoutAssignmentSummary,
  WorkoutPlan,
  WorkoutPlanDay,
} from '@/services/workout.service'

type DayAction = (day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) => void

function WorkoutPlanCard({
  assignment,
  plan,
  onStartDay,
  onEditDay,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  onStartDay: DayAction
  onEditDay: DayAction
}) {
  const { t } = useTranslation('member')
  const [expanded, setExpanded] = useState(false)
  const isPT = !!assignment.assignedByStaffId
  const totalDays = plan?.days?.length ?? assignment.plan?.days?.length ?? 0
  const totalExercises = plan?.days?.reduce((total, day) => total + (day.exercises?.length ?? 0), 0) ?? 0
  const totalEstSec = plan?.days?.reduce(
    (total, day) => total + (day.exercises?.reduce((exerciseTotal, exercise) => {
      const setTime = (exercise.targetDurationSec ?? 30) * exercise.targetSets
      const restTime = (exercise.restSeconds ?? 60) * (exercise.targetSets - 1)
      return exerciseTotal + setTime + restTime
    }, 0) ?? 0),
    0,
  ) ?? 0
  const avgMinPerDay = totalDays > 0 ? Math.round(totalEstSec / totalDays / 60) : 0

  return (
    <MemberCard
      as="article"
      variant={isPT ? 'accent' : 'default'}
      padding="none"
      className="overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start gap-2">
              <span
                className={`rogym-plan-source rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPT ? 'is-trainer-plan' : ''
                }`}
              >
                {isPT ? t('workout.createSession.sourceTrainer') : t('workout.createSession.sourcePersonal')}
              </span>
              <CardTitle size="md" as="h3" className="break-words">
                {assignment.plan?.name ?? plan?.name ?? '—'}
              </CardTitle>
            </div>
            {plan?.description && <p className="mt-1 text-xs rogym-sx-5e5c39ab">{plan.description}</p>}
            <div className="mt-2 flex gap-3 text-xs rogym-sx-5e5c39ab">
              <span>
                <span className="font-semibold text-white">{totalDays}</span> {t('workout.createSession.unitDays')}
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span>{' '}
                  {t('workout.createSession.unitExercises')}
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span>{' '}
                  {t('workout.createSession.unitMinPerDay')}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? t('workout.createSession.buttonHideDetail') : t('workout.createSession.buttonShowDetail')}
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
                  <p className="text-xs rogym-sx-5e5c39ab">
                    {day.exercises?.length ?? 0} {t('workout.createSession.unitExercises')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline-white"
                    size="sm"
                    onClick={() => onEditDay(day, assignment)}
                    aria-label={t('workout.createSession.buttonEditDay', { name: day.name })}
                    title={t('workout.createSession.buttonEditDay', { name: day.name })}
                    leftIcon={<Pencil size={14} />}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onStartDay(day, assignment)}
                    aria-label={t('workout.createSession.buttonStartDay', { name: day.name })}
                    title={t('workout.createSession.buttonStartDay', { name: day.name })}
                    leftIcon={<Play size={14} />}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </MemberCard>
  )
}

export function WorkoutPlanList({
  assignments,
  fullPlans,
  loading,
  error,
  onRetry,
  onCreatePlan,
  onStartDay,
  onEditDay,
}: {
  assignments: WorkoutAssignmentSummary[]
  fullPlans: Map<string, WorkoutPlan>
  loading: boolean
  error: string | null
  onRetry: () => void
  onCreatePlan: () => void
  onStartDay: DayAction
  onEditDay: DayAction
}) {
  const { t } = useTranslation('member')

  if (loading) return <MemberSkeleton rows={5} />
  if (error) return <MemberErrorState message={error} onRetry={onRetry} />
  if (assignments.length === 0) {
    return (
      <MemberEmptyState
        title={t('workout.createSession.emptyTitle')}
        description={t('workout.createSession.emptyDescription')}
        action={
          <Button variant="primary" onClick={onCreatePlan} leftIcon={<Dumbbell size={14} />}>
            {t('workout.createSession.buttonCreatePlan')}
          </Button>
        }
      />
    )
  }

  return (
    <>
      {assignments.map((assignment) => (
        <WorkoutPlanCard
          key={assignment.assignmentId}
          assignment={assignment}
          plan={fullPlans.get(assignment.planId) ?? null}
          onStartDay={onStartDay}
          onEditDay={onEditDay}
        />
      ))}
    </>
  )
}
