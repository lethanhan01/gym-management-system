import { describe, expect, it } from 'vitest'
import type { WorkoutPlanDay } from '@/services/workout.service'
import { buildSessionTimeline, formatTimer } from './sessionTimer'

const day: WorkoutPlanDay = {
  planDayId: '11', planId: '1', dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: 'Timer', notes: null,
  exercises: [
    { planExerciseId: '111', planDayId: '11', exerciseId: '1', orderIndex: 1, targetSets: 1, targetReps: 10, targetDurationSec: null, targetWeightKg: null, restSeconds: 20, notes: null, exercise: { exerciseId: '1', name: 'Squat', bodyPartId: 1, targetMuscleId: null, equipmentId: null, description: null, instructions: null, imageUrl: null, createdByStaffId: null, createdAt: '', deletedAt: null, bodyPart: { bodyPartId: 1, name: 'strength' } } },
    { planExerciseId: '112', planDayId: '11', exerciseId: '2', orderIndex: 2, targetSets: 2, targetReps: null, targetDurationSec: 30, targetWeightKg: null, restSeconds: 0, notes: null, exercise: { exerciseId: '2', name: 'Bike', bodyPartId: 2, targetMuscleId: null, equipmentId: null, description: null, instructions: null, imageUrl: null, createdByStaffId: null, createdAt: '', deletedAt: null, bodyPart: { bodyPartId: 2, name: 'cardio' } } },
  ],
}

describe('buildSessionTimeline', () => {
  it('uses 60 seconds for strength, the configured cardio duration, and the upcoming exercise rest', () => {
    const timeline = buildSessionTimeline(day, {
      111: { restSeconds: 20, sets: [{ actualReps: '10', actualWeightKg: '', actualDurationSec: '' }] },
      112: { restSeconds: 0, sets: [{ actualReps: '', actualWeightKg: '', actualDurationSec: '30' }, { actualReps: '', actualWeightKg: '', actualDurationSec: '30' }] },
    })
    expect(timeline.segments).toEqual([
      { kind: 'set', planExerciseId: '111', setIndex: 0, durationSec: 60 },
      { kind: 'set', planExerciseId: '112', setIndex: 0, durationSec: 30 },
      { kind: 'set', planExerciseId: '112', setIndex: 1, durationSec: 30 },
    ])
    expect(timeline.totalSeconds).toBe(120)
  })

  it('normalizes missing cardio duration to 60 seconds and skips zero-second rests', () => {
    const timeline = buildSessionTimeline(day, {
      111: { restSeconds: 20, sets: [{ actualReps: '10', actualWeightKg: '', actualDurationSec: '' }] },
      112: { restSeconds: 0, sets: [{ actualReps: '', actualWeightKg: '', actualDurationSec: '0' }, { actualReps: '', actualWeightKg: '', actualDurationSec: 'bad' }] },
    })
    expect(timeline.segments.map((segment) => segment.durationSec)).toEqual([60, 60, 60])
    expect(timeline.config[112].sets.map((set) => set.actualDurationSec)).toEqual(['60', '60'])
    expect(formatTimer(3661)).toBe('01:01:01')
  })
})
