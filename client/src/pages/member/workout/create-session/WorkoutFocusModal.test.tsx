import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/lib/i18n'
import type { WorkoutPlanDay } from '@/services/workout.service'
import type { SessionTimerRuntime } from './sessionDraft'
import { WorkoutFocusModal } from './WorkoutFocusModal'

const mockDay: WorkoutPlanDay = {
  planDayId: '1',
  planId: '1',
  dayNumber: 1,
  weekNumber: 1,
  dayOfWeek: 1,
  name: 'Day 1: Full Body',
  notes: null,
  exercises: [
    {
      planExerciseId: 'ex-1',
      planDayId: '1',
      exerciseId: '101',
      orderIndex: 1,
      targetSets: 2,
      targetReps: 10,
      targetDurationSec: null,
      targetWeightKg: '20',
      restSeconds: 30,
      notes: null,
      exercise: {
        exerciseId: '101',
        name: 'Barbell Squat',
        bodyPartId: 1,
        targetMuscleId: null,
        equipmentId: null,
        description: null,
        instructions: ['Stand with feet shoulder-width apart', 'Lower hips until thighs are parallel'],
        gifUrl: null,
        createdByStaffId: null,
        createdAt: '',
        deletedAt: null,
        bodyPart: { bodyPartId: 1, name: 'Legs' },
      },
    },
  ],
}

const mockRuntime: SessionTimerRuntime = {
  version: 1,
  status: 'running',
  segmentIndex: 0,
  segmentRemainingSec: 45,
  totalRemainingSec: 150,
  completionKey: 'test-key',
  loggedAt: null,
  config: {
    'ex-1': {
      restSeconds: 30,
      sets: [
        { actualReps: '10', actualWeightKg: '20', actualDurationSec: '' },
        { actualReps: '10', actualWeightKg: '20', actualDurationSec: '' },
      ],
    },
  },
  segments: [
    { kind: 'set', planExerciseId: 'ex-1', setIndex: 0, durationSec: 60 },
    { kind: 'rest', planExerciseId: 'ex-1', setIndex: 1, durationSec: 30 },
  ],
}

describe('WorkoutFocusModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  it('renders active set with countdown, set info and instructions', () => {
    const onPause = vi.fn()
    const onClose = vi.fn()

    render(
      <WorkoutFocusModal
        open={true}
        onClose={onClose}
        runtime={mockRuntime}
        status="running"
        day={mockDay}
        onPause={onPause}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    expect(screen.getByText('Day 1: Full Body')).toBeVisible()
    expect(screen.getByText('Barbell Squat')).toBeVisible()
    expect(screen.getByText('00:45')).toBeVisible()
    expect(screen.getByText('02:30')).toBeVisible()
    expect(screen.getByText('Stand with feet shoulder-width apart')).toBeVisible()
    expect(screen.getByText('Lower hips until thighs are parallel')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Dừng buổi tập' }))
    expect(onPause).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders rest segment with countdown, pause and skip rest buttons', () => {
    const restRuntime: SessionTimerRuntime = {
      ...mockRuntime,
      segmentIndex: 1,
      segmentRemainingSec: 25,
      totalRemainingSec: 90,
    }
    const onSkipRest = vi.fn()
    const onPause = vi.fn()

    render(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={restRuntime}
        status="running"
        day={mockDay}
        onPause={onPause}
        onResume={vi.fn()}
        onSkipRest={onSkipRest}
        celebrationSeconds={null}
      />
    )

    expect(screen.getAllByText(/Nghỉ giữa hiệp/)[0]).toBeVisible()
    expect(screen.getByText('00:25')).toBeVisible()
    expect(screen.getAllByText(/Thời gian còn lại/)[0]).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Dừng buổi tập' }))
    expect(onPause).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua nghỉ' }))
    expect(onSkipRest).toHaveBeenCalled()
  })

  it('renders celebration screen when celebrationSeconds is active', () => {
    const onClose = vi.fn()

    render(
      <WorkoutFocusModal
        open={true}
        onClose={onClose}
        runtime={mockRuntime}
        status="saving"
        day={mockDay}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={4}
      />
    )

    expect(screen.getAllByText('Chúc mừng bạn đã hoàn thành buổi tập!').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/4s/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Đóng ngay' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('safely handles instructions as a JSON string from API without throwing instructions.map error', () => {
    const jsonInstructionsDay: WorkoutPlanDay = {
      ...mockDay,
      exercises: [
        {
          ...mockDay.exercises![0],
          exercise: {
            ...mockDay.exercises![0].exercise!,
            instructions: JSON.stringify(['JSON Step 1: Warmup', 'JSON Step 2: Push']) as unknown as string[],
          },
        },
      ],
    }

    render(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={mockRuntime}
        status="running"
        day={jsonInstructionsDay}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    expect(screen.getByText('JSON Step 1: Warmup')).toBeVisible()
    expect(screen.getByText('JSON Step 2: Push')).toBeVisible()
  })

  it('safely handles instructions as plain multiline text or null', () => {
    const textInstructionsDay: WorkoutPlanDay = {
      ...mockDay,
      exercises: [
        {
          ...mockDay.exercises![0],
          exercise: {
            ...mockDay.exercises![0].exercise!,
            instructions: 'Step A\nStep B' as unknown as string[],
          },
        },
      ],
    }

    const { rerender } = render(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={mockRuntime}
        status="running"
        day={textInstructionsDay}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    expect(screen.getByText('Step A')).toBeVisible()
    expect(screen.getByText('Step B')).toBeVisible()

    const nullInstructionsDay: WorkoutPlanDay = {
      ...mockDay,
      exercises: [
        {
          ...mockDay.exercises![0],
          exercise: {
            ...mockDay.exercises![0].exercise!,
            instructions: null,
          },
        },
      ],
    }

    rerender(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={mockRuntime}
        status="running"
        day={nullInstructionsDay}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    expect(screen.getByText('Giữ đúng tư thế chuẩn, hít thở đều đặn và kiểm soát chuyển động.')).toBeVisible()
  })

  it('renders exercise GIF in active set and next exercise GIF in rest break', () => {
    const dayWithGifs: WorkoutPlanDay = {
      ...mockDay,
      exercises: [
        {
          ...mockDay.exercises![0],
          exercise: {
            ...mockDay.exercises![0].exercise!,
            gifUrl: 'https://example.com/squat.gif',
          },
        },
        {
          planExerciseId: 'ex-2',
          planDayId: '1',
          exerciseId: '102',
          orderIndex: 2,
          targetSets: 2,
          targetReps: 12,
          targetDurationSec: null,
          targetWeightKg: '10',
          restSeconds: 30,
          notes: null,
          exercise: {
            exerciseId: '102',
            name: 'Push Up',
            bodyPartId: 2,
            targetMuscleId: null,
            equipmentId: null,
            description: null,
            instructions: ['Keep core tight'],
            gifUrl: 'https://example.com/pushup.gif',
            createdByStaffId: null,
            createdAt: '',
            deletedAt: null,
          },
        },
      ],
    }

    const activeRuntime: SessionTimerRuntime = {
      ...mockRuntime,
      segmentIndex: 0,
    }

    const { rerender } = render(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={activeRuntime}
        status="running"
        day={dayWithGifs}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    const activeGif = screen.getByAltText('Barbell Squat')
    expect(activeGif).toBeVisible()
    expect(activeGif).toHaveAttribute('src', 'https://example.com/squat.gif')

    const restRuntime: SessionTimerRuntime = {
      ...mockRuntime,
      config: {
        ...mockRuntime.config,
        'ex-2': {
          restSeconds: 30,
          sets: [{ actualReps: '12', actualWeightKg: '10', actualDurationSec: '' }],
        },
      },
      segments: [
        { kind: 'set', planExerciseId: 'ex-1', setIndex: 0, durationSec: 60 },
        { kind: 'rest', planExerciseId: 'ex-1', setIndex: 0, durationSec: 30 },
        { kind: 'set', planExerciseId: 'ex-2', setIndex: 0, durationSec: 60 },
      ],
      segmentIndex: 1,
      segmentRemainingSec: 30,
    }

    rerender(
      <WorkoutFocusModal
        open={true}
        onClose={vi.fn()}
        runtime={restRuntime}
        status="running"
        day={dayWithGifs}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkipRest={vi.fn()}
        celebrationSeconds={null}
      />
    )

    const nextGif = screen.getByAltText('Push Up')
    expect(nextGif).toBeVisible()
    expect(nextGif).toHaveAttribute('src', 'https://example.com/pushup.gif')
  })
})
