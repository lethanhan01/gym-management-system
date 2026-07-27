import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import workoutService, { type WorkoutAssignmentSummary, type WorkoutPlan } from '@/services/workout.service'
import { trainingService, type TrainingSessionDetail } from '@/services/training.service'
import CreateWorkoutSessionPage from './CreateWorkoutSessionPage'

vi.mock('@/services/workout.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/workout.service')>('@/services/workout.service')
  return { ...actual, default: { ...actual.default, getAssignments: vi.fn(), getPlan: vi.fn() } }
})

vi.mock('@/services/training.service', () => ({ trainingService: { getSession: vi.fn() } }))

const assignment: WorkoutAssignmentSummary = {
  assignmentId: '101', memberId: '10', planId: '1', assignedByStaffId: '20', startDate: '2026-07-01',
  status: 'active', endedAt: null, notes: null, createdAt: '2026-07-01T00:00:00.000Z',
  plan: { planId: '1', name: 'Plan PT', description: null, status: 'active', days: [{ planDayId: '11', weekNumber: 1, dayOfWeek: 1, dayNumber: 1, name: '全身A' }] },
}

const plan: WorkoutPlan = {
  planId: '1', creatorStaffId: '20', creatorMemberId: null, creatorType: 'staff', name: 'Plan PT',
  description: null, status: 'active', createdAt: '2026-07-01T00:00:00.000Z', deletedAt: null,
  days: [{ planDayId: '11', planId: '1', dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: '全身A', notes: null, exercises: [{
    planExerciseId: '111', planDayId: '11', exerciseId: '1001', orderIndex: 1, targetSets: 3, targetReps: 10,
    targetDurationSec: null, targetWeightKg: '20', restSeconds: 60, notes: null,
    exercise: { exerciseId: '1001', name: 'Squat', bodyPartId: 1, targetMuscleId: null, equipmentId: null, description: null, instructions: null, imageUrl: null, createdByStaffId: null, createdAt: '2026-07-01T00:00:00.000Z', deletedAt: null, bodyPart: { bodyPartId: 1, name: 'strength' } },
  }] }],
}

function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

function renderPage(path = '/member/workout/create-session') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/member/workout/create-session" element={<CreateWorkoutSessionPage />} />
        <Route path="/member/workout/create-session/day/:planDayId" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  )
}

function makeSessionDetail(overrides: Partial<TrainingSessionDetail> = {}): TrainingSessionDetail {
  return {
    sessionId: '555', memberId: '10', memberName: 'Member', trainerStaffId: '20', trainerName: 'Trainer A', roomId: '30', roomName: 'Room A', assignmentId: '101', planDayId: '11',
    workoutPlan: { planId: '1', name: 'Plan PT', description: null, status: 'active' },
    planDay: { planDayId: '11', planId: '1', dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: '全身A', notes: null },
    startTime: '2026-07-27T10:00:00.000Z', endTime: '2026-07-27T11:00:00.000Z', status: 'scheduled', attendanceLogs: [], ...overrides,
  }
}

describe('CreateWorkoutSessionPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.getState().setAuth({ userId: '1', email: 'member@example.com', fullName: 'Member', roles: ['member'], memberId: '10' }, 'token')
    vi.mocked(workoutService.getAssignments).mockResolvedValue([assignment])
    vi.mocked(workoutService.getPlan).mockResolvedValue(plan)
    vi.mocked(trainingService.getSession).mockResolvedValue(makeSessionDetail())
  })

  it('configures per-set values and sends the started day to its child route', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem chi tiết ngày tập' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa 全身A' }))
    expect(await screen.findAllByLabelText('Số reps')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm set' }))
    expect(screen.getAllByLabelText('Số reps')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Xóa set 4' }))
    expect(screen.getAllByLabelText('Số reps')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu 全身A' }))
    expect(await screen.findByTestId('location')).toHaveTextContent('/member/workout/create-session/day/11?assignmentId=101')
  })

  it('redirects a valid scheduled-session deep link to the associated child route', async () => {
    renderPage('/member/workout/create-session?sessionId=555')
    expect(await screen.findByTestId('location')).toHaveTextContent('/member/workout/create-session/day/11?assignmentId=101&sessionId=555')
    expect(trainingService.getSession).toHaveBeenCalledWith('555')
  })

  it('keeps manual selection available when the session has no linked plan', async () => {
    vi.mocked(trainingService.getSession).mockResolvedValue(makeSessionDetail({ assignmentId: null, planDayId: null, workoutPlan: null, planDay: null }))
    renderPage('/member/workout/create-session?sessionId=555')
    expect(await screen.findByRole('status')).toHaveTextContent('Buổi tập này chưa có workout plan liên kết')
  })
})
