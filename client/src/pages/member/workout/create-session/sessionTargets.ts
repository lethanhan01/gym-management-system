import type {
  WorkoutAssignmentSummary,
  WorkoutPlanDay,
  WorkoutPlanExercise,
} from '@/services/workout.service'
import type { SessionDayTargets, SessionExerciseTargets, SetState } from './types'

export function getSessionConfigKey(day: WorkoutPlanDay, assignment: WorkoutAssignmentSummary) {
  return `${assignment.assignmentId}:${day.planDayId}`
}

export function makeSessionExerciseTargets(exercise: WorkoutPlanExercise): SessionExerciseTargets {
  return {
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetDurationSec: exercise.targetDurationSec,
    targetWeightKg: exercise.targetWeightKg ? String(Number(exercise.targetWeightKg)) : '',
    restSeconds: exercise.restSeconds ?? 60,
  }
}

export function makeSessionDayTargets(
  day: WorkoutPlanDay,
  overrides?: SessionDayTargets,
): SessionDayTargets {
  return (day.exercises ?? []).reduce<SessionDayTargets>((targets, exercise) => {
    targets[exercise.planExerciseId] = overrides?.[exercise.planExerciseId]
      ?? makeSessionExerciseTargets(exercise)
    return targets
  }, {})
}

export function applySessionTargets(
  day: WorkoutPlanDay,
  overrides?: SessionDayTargets,
): WorkoutPlanDay {
  if (!day.exercises || !overrides) return day

  return {
    ...day,
    exercises: day.exercises.map((exercise) => {
      const targets = overrides[exercise.planExerciseId]
      if (!targets) return exercise

      return {
        ...exercise,
        targetSets: targets.targetSets,
        targetReps: targets.targetReps,
        targetDurationSec: targets.targetDurationSec,
        targetWeightKg: targets.targetWeightKg || null,
        restSeconds: targets.restSeconds,
      }
    }),
  }
}

export function makeDefaultSets(exercise: WorkoutPlanExercise): SetState[] {
  return Array.from({ length: exercise.targetSets }, () => ({
    actualReps: exercise.targetReps ? String(exercise.targetReps) : '',
    actualWeightKg: exercise.targetWeightKg ? String(Number(exercise.targetWeightKg)) : '',
    actualDurationSec: exercise.targetDurationSec ? String(exercise.targetDurationSec) : '',
    completed: false,
  }))
}
