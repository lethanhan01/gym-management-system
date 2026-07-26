import type { WorkoutPlanDay, WorkoutPlanExercise } from '@/services/workout.service'
import type { SessionDayConfig } from './types'

export type TimerSegment = {
  kind: 'set' | 'rest'
  durationSec: number
  planExerciseId: string
  setIndex: number
}

export type TimerTimeline = {
  segments: TimerSegment[]
  totalSeconds: number
  config: SessionDayConfig
}

function isCardio(exercise: WorkoutPlanExercise) {
  return exercise.exercise?.bodyPart?.name?.trim().toLowerCase() === 'cardio'
}

function toPositiveSeconds(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60
}

function copyConfig(config: SessionDayConfig): SessionDayConfig {
  return Object.fromEntries(Object.entries(config).map(([id, exercise]) => [id, {
    restSeconds: Number.isInteger(exercise.restSeconds) && exercise.restSeconds > 0 ? exercise.restSeconds : 0,
    sets: exercise.sets.map((set) => ({ ...set })),
  }]))
}

export function buildSessionTimeline(day: WorkoutPlanDay, input: SessionDayConfig): TimerTimeline {
  const config = copyConfig(input)
  const sets: Array<{ planExerciseId: string; setIndex: number; durationSec: number }> = []
  const exercises = [...(day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

  for (const exercise of exercises) {
    const exerciseConfig = config[exercise.planExerciseId]
    if (!exerciseConfig) continue
    exerciseConfig.sets.forEach((set, setIndex) => {
      const durationSec = isCardio(exercise) ? toPositiveSeconds(set.actualDurationSec) : 60
      if (isCardio(exercise)) exerciseConfig.sets[setIndex] = { ...set, actualDurationSec: String(durationSec) }
      sets.push({ planExerciseId: exercise.planExerciseId, setIndex, durationSec })
    })
  }

  const segments: TimerSegment[] = []
  sets.forEach((set, index) => {
    segments.push({ kind: 'set', ...set })
    const next = sets[index + 1]
    if (!next) return
    const restSeconds = config[next.planExerciseId]?.restSeconds ?? 0
    if (restSeconds > 0) segments.push({
      kind: 'rest', durationSec: restSeconds, planExerciseId: next.planExerciseId, setIndex: next.setIndex,
    })
  })

  return { segments, totalSeconds: segments.reduce((sum, segment) => sum + segment.durationSec, 0), config }
}

export function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainingSeconds = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}` : `${pad(minutes)}:${pad(remainingSeconds)}`
}

export function createCompletionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letter) => {
    const random = Math.floor(Math.random() * 16)
    const value = letter === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
