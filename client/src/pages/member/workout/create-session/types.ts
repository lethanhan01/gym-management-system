import type {
  WorkoutAssignmentSummary,
  WorkoutPlanDay,
} from '@/services/workout.service'

export interface SetState {
  actualReps: string
  actualWeightKg: string
  actualDurationSec: string
  completed: boolean
}

export interface SessionExerciseTargets {
  targetSets: number
  targetReps: number | null
  targetDurationSec: number | null
  targetWeightKg: string
  restSeconds: number
}

export type SessionDayTargets = Record<string, SessionExerciseTargets>

export type SessionConfigTarget = {
  day: WorkoutPlanDay
  assignment: WorkoutAssignmentSummary
}

export type UpdateSet = (
  exerciseIndex: number,
  setIndex: number,
  field: keyof SetState,
  value: string | boolean,
) => void
