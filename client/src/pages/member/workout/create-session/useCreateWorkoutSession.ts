import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'
import {
  applySessionTargets,
  getSessionConfigKey,
  makeDefaultSets,
} from './sessionTargets'
import type {
  SessionConfigTarget,
  SessionDayTargets,
  SetState,
  UpdateSet,
} from './types'

export function useCreateWorkoutSession() {
  const { t } = useTranslation('member')
  const user = useAuthStore((state) => state.user)
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [fullPlans, setFullPlans] = useState<Map<string, WorkoutPlan>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<WorkoutPlanDay | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<WorkoutAssignmentSummary | null>(null)
  const [sessionTargetOverrides, setSessionTargetOverrides] = useState<Record<string, SessionDayTargets>>({})
  const [configTarget, setConfigTarget] = useState<SessionConfigTarget | null>(null)
  const [sets, setSets] = useState<SetState[][]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const all = await workoutService.getAssignments(memberId)
      const active = all.filter((assignment) => assignment.status === 'active')
      setAssignments(active)
      const pairs = await Promise.all(
        active.map(async (assignment) => {
          try {
            const plan = await workoutService.getPlan(assignment.planId)
            return [assignment.planId, plan] as const
          } catch {
            return null
          }
        }),
      )
      const planMap = new Map<string, WorkoutPlan>()
      for (const pair of pairs) {
        if (pair) planMap.set(pair[0], pair[1])
      }
      setFullPlans(planMap)
    } catch {
      setError(t('workout.createSession.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [memberId, t])

  useEffect(() => {
    void load()
  }, [load])

  function startDay(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
    const configuredDay = applySessionTargets(
      day,
      sessionTargetOverrides[getSessionConfigKey(day, assignment)],
    )
    setSelectedDay(configuredDay)
    setSelectedAssignment(assignment)
    setDone(false)
    setSubmitError(null)
    setSets(
      configuredDay.exercises
        ? [...configuredDay.exercises].sort((a, b) => a.orderIndex - b.orderIndex).map(makeDefaultSets)
        : [],
    )
  }

  function openSessionConfig(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
    setConfigTarget({ day, assignment })
  }

  function closeSessionConfig() {
    setConfigTarget(null)
  }

  function saveSessionTargets(targets: SessionDayTargets) {
    if (!configTarget) return
    const key = getSessionConfigKey(configTarget.day, configTarget.assignment)
    setSessionTargetOverrides((previous) => ({ ...previous, [key]: targets }))
    setConfigTarget(null)
  }

  const updateSet: UpdateSet = (exerciseIndex, setIndex, field, value) => {
    setSets((previous) => {
      const next = previous.map((exerciseSets) => [...exerciseSets])
      if (field === 'actualReps' && setIndex === 0 && typeof value === 'string') {
        next[exerciseIndex] = next[exerciseIndex].map((set) => ({ ...set, actualReps: value }))
        return next
      }
      if (field === 'actualWeightKg' && setIndex === 0 && typeof value === 'string') {
        next[exerciseIndex] = next[exerciseIndex].map((set) => ({ ...set, actualWeightKg: value }))
        return next
      }
      next[exerciseIndex][setIndex] = { ...next[exerciseIndex][setIndex], [field]: value }
      return next
    })
  }

  async function finishSession() {
    if (!selectedAssignment || !selectedDay) return

    setSubmitting(true)
    setSubmitError(null)
    const exercises = selectedDay.exercises
      ? [...selectedDay.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
      : []
    const logSets = exercises.flatMap((exercise, exerciseIndex) =>
      (sets[exerciseIndex] ?? []).map((set, setIndex) => ({
        planExerciseId: Number(exercise.planExerciseId),
        setNumber: setIndex + 1,
        actualReps: set.actualReps ? Number(set.actualReps) : undefined,
        actualWeightKg: set.actualWeightKg ? Number(set.actualWeightKg) : undefined,
        actualDurationSec: set.actualDurationSec ? Number(set.actualDurationSec) : undefined,
        completed: true,
      })),
    )

    try {
      await workoutService.createLog({
        assignmentId: Number(selectedAssignment.assignmentId),
        planDayId: Number(selectedDay.planDayId),
        loggedAt: new Date().toISOString(),
        sets: logSets,
      })
      setDone(true)
    } catch {
      setSubmitError(t('workout.createSession.errorSave'))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    assignments,
    fullPlans,
    loading,
    error,
    selectedDay,
    sets,
    submitting,
    submitError,
    done,
    configTarget,
    configInitialTargets: configTarget
      ? sessionTargetOverrides[getSessionConfigKey(configTarget.day, configTarget.assignment)]
      : undefined,
    load,
    startDay,
    openSessionConfig,
    closeSessionConfig,
    saveSessionTargets,
    updateSet,
    finishSession,
  }
}
