import { describe, expect, it } from 'vitest'
import type {
  WorkoutAssignmentSummary,
  WorkoutPlanDay,
} from '@/services/workout.service'
import {
  applySessionTargets,
  getSessionConfigKey,
  makeDefaultSets,
  makeSessionDayTargets,
} from './sessionTargets'

const day: WorkoutPlanDay = {
  planDayId: '10',
  planId: '1',
  dayNumber: 1,
  weekNumber: 1,
  dayOfWeek: 1,
  name: 'Full body',
  notes: null,
  exercises: [{
    planExerciseId: '100',
    planDayId: '10',
    exerciseId: '1000',
    orderIndex: 1,
    targetSets: 3,
    targetReps: 10,
    targetDurationSec: null,
    targetWeightKg: '20',
    restSeconds: 60,
    notes: null,
  }],
}

const assignment: WorkoutAssignmentSummary = {
  assignmentId: '50',
  memberId: '5',
  planId: '1',
  assignedByStaffId: null,
  startDate: '2026-01-01',
  status: 'active',
  endedAt: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  plan: null,
}

describe('sessionTargets', () => {
  it('creates defaults and keys overrides by assignment plus plan day', () => {
    expect(getSessionConfigKey(day, assignment)).toBe('50:10')
    expect(makeSessionDayTargets(day)).toEqual({
      100: {
        targetSets: 3,
        targetReps: 10,
        targetDurationSec: null,
        targetWeightKg: '20',
        restSeconds: 60,
      },
    })
  })

  it('applies overrides without mutating the original workout day', () => {
    const configuredDay = applySessionTargets(day, {
      100: {
        targetSets: 4,
        targetReps: 12,
        targetDurationSec: null,
        targetWeightKg: '25',
        restSeconds: 45,
      },
    })

    expect(configuredDay).not.toBe(day)
    expect(configuredDay.exercises?.[0]).toMatchObject({
      targetSets: 4,
      targetReps: 12,
      targetWeightKg: '25',
      restSeconds: 45,
    })
    expect(day.exercises?.[0]).toMatchObject({
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: '20',
      restSeconds: 60,
    })
    expect(makeDefaultSets(configuredDay.exercises![0])).toHaveLength(4)
  })
})
