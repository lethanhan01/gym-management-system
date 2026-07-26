import type { WorkoutAssignmentSummary, WorkoutPlanDay } from '@/services/workout.service'
import { getSessionConfigKey } from './sessionTargets'
import type { SessionDayConfig } from './types'

const STORAGE_PREFIX = 'rogym:create-session-draft:'

export function getSessionDraftStorageKey(
  memberId: string,
  day: WorkoutPlanDay,
  assignment: WorkoutAssignmentSummary,
  sessionId: string | null,
) {
  return `${STORAGE_PREFIX}${memberId}:${getSessionConfigKey(day, assignment)}:${sessionId ?? 'manual'}`
}

export function loadSessionDraft(
  memberId: string,
  day: WorkoutPlanDay,
  assignment: WorkoutAssignmentSummary,
  sessionId: string | null,
): SessionDayConfig | undefined {
  try {
    const raw = window.sessionStorage.getItem(getSessionDraftStorageKey(memberId, day, assignment, sessionId))
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as SessionDayConfig : undefined
  } catch {
    return undefined
  }
}

export function saveSessionDraft(
  memberId: string,
  day: WorkoutPlanDay,
  assignment: WorkoutAssignmentSummary,
  sessionId: string | null,
  draft: SessionDayConfig,
) {
  try {
    window.sessionStorage.setItem(
      getSessionDraftStorageKey(memberId, day, assignment, sessionId),
      JSON.stringify(draft),
    )
  } catch {
    // The workout can still continue if browser storage is unavailable.
  }
}

export function clearSessionDraft(
  memberId: string,
  day: WorkoutPlanDay,
  assignment: WorkoutAssignmentSummary,
  sessionId: string | null,
) {
  try {
    window.sessionStorage.removeItem(getSessionDraftStorageKey(memberId, day, assignment, sessionId))
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
