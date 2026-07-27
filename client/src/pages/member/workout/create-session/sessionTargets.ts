import type {
  WorkoutAssignmentSummary,
  WorkoutPlanDay,
  WorkoutPlanExercise,
} from '@/services/workout.service'
import type { SessionDayConfig, SessionExerciseConfig, SessionSetConfig } from './types'

export function getSessionConfigKey(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
  return `${assignment.assignmentId}:${day.planDayId}`
}

export function makeSessionSetConfig(exercise: WorkoutPlanExercise): SessionSetConfig {
  return {
    actualReps: exercise.targetReps ? String(exercise.targetReps) : '',
    actualWeightKg: exercise.targetWeightKg ? String(Number(exercise.targetWeightKg)) : '',
    actualDurationSec: exercise.targetDurationSec ? String(exercise.targetDurationSec) : '',
  }
}

export function makeSessionExerciseConfig(exercise: WorkoutPlanExercise): SessionExerciseConfig {
  return {
    sets: Array.from({ length: Math.max(1, exercise.targetSets) }, () => makeSessionSetConfig(exercise)),
    restSeconds: exercise.restSeconds ?? 60,
  }
}

export function makeSessionDayConfig(
  day: WorkoutPlanDay,
  draft?: SessionDayConfig,
): SessionDayConfig {
  return (day.exercises ?? []).reduce<SessionDayConfig>((config, exercise) => {
    const saved = draft?.[exercise.planExerciseId]
    config[exercise.planExerciseId] = saved && saved.sets.length > 0
      ? saved
      : makeSessionExerciseConfig(exercise)
    return config
  }, {})
}
