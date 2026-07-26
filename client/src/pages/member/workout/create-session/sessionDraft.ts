import type { WorkoutAssignmentSummary, WorkoutPlanDay } from '@/services/workout.service'
import { getSessionConfigKey } from './sessionTargets'
import type { SessionDayConfig } from './types'
import type { TimerSegment } from './sessionTimer'

const STORAGE_PREFIX = 'rogym:create-session-draft:'
const RUNTIME_STORAGE_PREFIX = 'rogym:create-session-runtime:'

export type SessionTimerRuntime = {
  version: 1
  status: 'running' | 'paused' | 'saving' | 'save-error'
  segments: TimerSegment[]
  config: SessionDayConfig
  segmentIndex: number
  segmentRemainingSec: number
  totalRemainingSec: number
  completionKey: string
  loggedAt: string | null
}

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

export function getSessionRuntimeStorageKey(
  memberId: string,
  day: WorkoutPlanDay,
  assignment: WorkoutAssignmentSummary,
  sessionId: string | null,
) {
  return `${RUNTIME_STORAGE_PREFIX}${memberId}:${getSessionConfigKey(day, assignment)}:${sessionId ?? 'manual'}`
}

function isRuntime(value: unknown): value is SessionTimerRuntime {
  if (!value || typeof value !== 'object') return false
  const runtime = value as Partial<SessionTimerRuntime>
  return runtime.version === 1 && Array.isArray(runtime.segments) && !!runtime.config
    && typeof runtime.segmentIndex === 'number' && typeof runtime.segmentRemainingSec === 'number'
    && typeof runtime.totalRemainingSec === 'number' && typeof runtime.completionKey === 'string'
}

export function loadSessionRuntime(
  memberId: string, day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary, sessionId: string | null,
): SessionTimerRuntime | undefined {
  try {
    const raw = window.sessionStorage.getItem(getSessionRuntimeStorageKey(memberId, day, assignment, sessionId))
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    if (!isRuntime(parsed)) return undefined
    return parsed.status === 'running' ? { ...parsed, status: 'paused' } : parsed
  } catch {
    return undefined
  }
}

export function saveSessionRuntime(
  memberId: string, day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary, sessionId: string | null,
  runtime: SessionTimerRuntime,
) {
  try {
    window.sessionStorage.setItem(getSessionRuntimeStorageKey(memberId, day, assignment, sessionId), JSON.stringify(runtime))
  } catch {
    // Continue in memory when storage is unavailable.
  }
}

export function clearSessionRuntime(
  memberId: string, day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary, sessionId: string | null,
) {
  try {
    window.sessionStorage.removeItem(getSessionRuntimeStorageKey(memberId, day, assignment, sessionId))
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
