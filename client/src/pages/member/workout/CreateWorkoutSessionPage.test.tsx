import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
} from '@/services/workout.service'
import CreateWorkoutSessionPage from './CreateWorkoutSessionPage'

vi.mock('@/services/workout.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/workout.service')>(
    '@/services/workout.service'
  )
  return {
    ...actual,
    default: {
      ...actual.default,
      getAssignments: vi.fn(),
      getPlan: vi.fn(),
      createLog: vi.fn(),
    },
  }
})

const trainerAssignment: WorkoutAssignmentSummary = {
  assignmentId: '101',
  memberId: '10',
  planId: '1',
  assignedByStaffId: '20',
  startDate: '2026-07-01',
  status: 'active',
  endedAt: null,
  notes: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  plan: {
    planId: '1',
    name: 'Plan PT',
    description: null,
    status: 'active',
    days: [{ planDayId: '11', weekNumber: 1, dayOfWeek: 1, dayNumber: 1, name: '全身A' }],
  },
}

const personalAssignment: WorkoutAssignmentSummary = {
  ...trainerAssignment,
  assignmentId: '102',
  planId: '2',
  assignedByStaffId: null,
  plan: {
    planId: '2',
    name: 'Plan cá nhân',
    description: null,
    status: 'active',
    days: [{ planDayId: '21', weekNumber: 1, dayOfWeek: 2, dayNumber: 2, name: 'Cardio' }],
  },
}

const trainerPlan: WorkoutPlan = {
  planId: '1',
  creatorStaffId: '20',
  creatorMemberId: null,
  creatorType: 'staff',
  name: 'Plan PT',
  description: null,
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  deletedAt: null,
  days: [{
    planDayId: '11',
    planId: '1',
    dayNumber: 1,
    weekNumber: 1,
    dayOfWeek: 1,
    name: '全身A',
    notes: null,
    exercises: [{
      planExerciseId: '111',
      planDayId: '11',
      exerciseId: '1001',
      orderIndex: 1,
      targetSets: 3,
      targetReps: 10,
      targetDurationSec: null,
      targetWeightKg: '20',
      restSeconds: 60,
      notes: null,
      exercise: {
        exerciseId: '1001',
        name: 'Squat',
        bodyPartId: 1,
        targetMuscleId: null,
        equipmentId: null,
        description: null,
        instructions: null,
        imageUrl: null,
        createdByStaffId: null,
        createdAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
        bodyPart: { bodyPartId: 1, name: 'strength' },
      },
    }],
  }],
}

const personalPlan: WorkoutPlan = {
  ...trainerPlan,
  planId: '2',
  creatorStaffId: null,
  creatorMemberId: '10',
  creatorType: 'member',
  name: 'Plan cá nhân',
  days: [{
    ...trainerPlan.days![0],
    planDayId: '21',
    planId: '2',
    dayNumber: 2,
    dayOfWeek: 2,
    name: 'Cardio',
    exercises: [{
      ...trainerPlan.days![0].exercises![0],
      planExerciseId: '211',
      planDayId: '21',
      exerciseId: '2001',
      targetSets: 2,
      targetReps: null,
      targetDurationSec: 90,
      targetWeightKg: null,
      restSeconds: 30,
      exercise: {
        ...trainerPlan.days![0].exercises![0].exercise!,
        exerciseId: '2001',
        name: 'Run',
        bodyPart: { bodyPartId: 2, name: 'cardio' },
      },
    }],
  }],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateWorkoutSessionPage />
    </MemoryRouter>
  )
}

describe('CreateWorkoutSessionPage session configuration', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '10',
      },
      'token'
    )
    vi.mocked(workoutService.getAssignments).mockResolvedValue([trainerAssignment, personalAssignment])
    vi.mocked(workoutService.getPlan).mockImplementation(async (planId) =>
      planId === '1' ? trainerPlan : personalPlan
    )
  })

  it('shows edit controls for PT and personal plans, then applies saved targets only to the started session', async () => {
    renderPage()

    const detailButtons = await screen.findAllByRole('button', { name: 'Xem chi tiết ngày tập' })
    fireEvent.click(detailButtons[0])
    fireEvent.click(detailButtons[1])

    expect(screen.getByRole('button', { name: 'Chỉnh sửa 全身A' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa Cardio' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa 全身A' }))
    expect(await screen.findByText('Chỉnh sửa buổi 全身A')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Số sets'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Số reps'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Mức tạ (kg)'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Nghỉ giữa sets (giây)'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu 全身A' }))

    expect(screen.getAllByPlaceholderText('reps')).toHaveLength(4)
    expect(screen.getAllByDisplayValue('12')).toHaveLength(4)
    expect(screen.getAllByDisplayValue('25')).toHaveLength(4)
    expect(screen.getAllByRole('progressbar', { name: 'Nghỉ 45 giây' })).toHaveLength(3)
  })

  it('shows duration instead of reps when editing a cardio exercise', async () => {
    renderPage()

    const detailButtons = await screen.findAllByRole('button', { name: 'Xem chi tiết ngày tập' })
    fireEvent.click(detailButtons[1])
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Cardio' }))

    expect(await screen.findByLabelText('Thời gian tập mỗi set (giây)')).toHaveValue(90)
    expect(screen.queryByLabelText('Số reps')).not.toBeInTheDocument()
  })
})
