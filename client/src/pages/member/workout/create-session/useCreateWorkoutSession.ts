import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import { trainingSessionService } from '@/services/training-session.service'
import { useAuthStore } from '@/stores/authStore'
import { loadSessionDraft, saveSessionDraft } from './sessionDraft'
import type { SessionConfigTarget, SessionDayConfig } from './types'

function getDeepLinkSessionId(value: string | null) {
  return value && /^[1-9]\d*$/.test(value) ? value : null
}

export function useCreateWorkoutSession(sessionIdValue?: string | null) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [fullPlans, setFullPlans] = useState<Map<string, WorkoutPlan>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configTarget, setConfigTarget] = useState<SessionConfigTarget | null>(null)
  const [preselectionNotice, setPreselectionNotice] = useState<string | null>(null)
  const sessionId = getDeepLinkSessionId(sessionIdValue ?? null)

  const startDay = useCallback((day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) => {
    const query = new URLSearchParams({ assignmentId: assignment.assignmentId })
    if (sessionId) query.set('sessionId', sessionId)
    navigate(`/member/workout/create-session/day/${day.planDayId}?${query.toString()}`)
  }, [navigate, sessionId])

  const load = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setPreselectionNotice(null)
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

      if (sessionId) {
        try {
const session = await trainingSessionService.getSession(sessionId)
          if (!session.assignmentId || !session.planDayId) {
            setPreselectionNotice(t('workout.createSession.noLinkedPlan'))
          } else {
            const assignment = active.find((item) => item.assignmentId === session.assignmentId)
            const day = assignment
              ? planMap.get(assignment.planId)?.days?.find(
                  (item) => item.planDayId === session.planDayId,
                )
              : undefined
            if (assignment && day) {
              startDay(day, assignment)
            } else {
              setPreselectionNotice(t('workout.createSession.linkedPlanUnavailable'))
            }
          }
        } catch {
          setPreselectionNotice(t('workout.createSession.linkedPlanUnavailable'))
        }
      }
    } catch {
      setError(t('workout.createSession.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [memberId, sessionId, startDay, t])

  useEffect(() => {
    void load()
  }, [load])

  function openSessionConfig(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
    setConfigTarget({ day, assignment })
  }

  function closeSessionConfig() {
    setConfigTarget(null)
  }

  function saveSessionConfig(config: SessionDayConfig) {
    if (!configTarget || !memberId) return
    saveSessionDraft(memberId, configTarget.day, configTarget.assignment, sessionId, config)
    setConfigTarget(null)
  }

  return {
    assignments,
    fullPlans,
    loading,
    error,
    preselectionNotice,
    configTarget,
    configInitialConfig: configTarget && memberId
      ? loadSessionDraft(memberId, configTarget.day, configTarget.assignment, sessionId)
      : undefined,
    load,
    startDay,
    openSessionConfig,
    closeSessionConfig,
    saveSessionConfig,
  }
}
