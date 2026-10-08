import type {
  WorkoutAssignmentSummary,
  WorkoutPlanDay,
} from '@/services/workout.service'

export interface SessionSetConfig {
  id?: string
  actualReps: string
  actualWeightKg: string
  actualDurationSec: string
}

export interface SessionExerciseConfig {
  sets: SessionSetConfig[]
  restSeconds: number
}

export type SessionDayConfig = Record<string, SessionExerciseConfig>

export type SessionConfigTarget = {
  day: WorkoutPlanDay
  assignment: WorkoutAssignmentSummary
}
