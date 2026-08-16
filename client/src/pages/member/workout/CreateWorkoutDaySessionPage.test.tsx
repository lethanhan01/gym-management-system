import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import workoutService, { type WorkoutAssignmentSummary, type WorkoutPlan } from '@/services/workout.service'
import { trainingSessionService, type TrainingSessionDetail } from '@/services/training-session.service'
import { getSessionDraftStorageKey, saveSessionDraft } from './create-session/sessionDraft'
import CreateWorkoutDaySessionPage from './CreateWorkoutDaySessionPage'

vi.mock('@/services/workout.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/workout.service')>('@/services/workout.service')
  return { ...actual, default: { ...actual.default, getAssignments: vi.fn(), getPlan: vi.fn(), createLog: vi.fn() } }
})

vi.mock('@/services/training-session.service', () => ({ trainingSessionService: { getSession: vi.fn() } }))

const assignment: WorkoutAssignmentSummary = {
  assignmentId: '101', memberId: '10', planId: '1', assignedByStaffId: '20', startDate: '2026-07-01',
  status: 'active', endedAt: null, notes: null, createdAt: '2026-07-01T00:00:00.000Z', plan: null,
}

const plan: WorkoutPlan = {
  planId: '1', creatorStaffId: '20', creatorMemberId: null, creatorType: 'staff', name: 'Plan PT', description: null,
  status: 'active', createdAt: '2026-07-01T00:00:00.000Z', deletedAt: null,
  days: [{ planDayId: '11', planId: '1', dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: '全身A', notes: null, exercises: [{
    planExerciseId: '111', planDayId: '11', exerciseId: '1001', orderIndex: 1, targetSets: 3, targetReps: 10,
    targetDurationSec: null, targetWeightKg: '20', restSeconds: 60, notes: null,
    exercise: { exerciseId: '1001', name: 'Squat', bodyPartId: 1, targetMuscleId: null, equipmentId: null, description: null, instructions: null, imageUrl: null, createdByStaffId: null, createdAt: '2026-07-01T00:00:00.000Z', deletedAt: null, bodyPart: { bodyPartId: 1, name: 'strength' } },
  }] }],
}

const session: TrainingSessionDetail = {
  sessionId: '555', memberId: '10', memberName: 'Member', trainerStaffId: '20', trainerName: 'Trainer A', roomId: '30', roomName: 'Room A', assignmentId: '101', planDayId: '11',
  workoutPlan: { planId: '1', name: 'Plan PT', description: null, status: 'active' },
  planDay: { planDayId: '11', planId: '1', dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: '全身A', notes: null },
  startTime: '2026-07-27T10:00:00.000Z', endTime: '2026-07-27T11:00:00.000Z', status: 'scheduled', attendanceLogs: [],
}

function renderPage(path = '/member/workout/create-session/day/11?assignmentId=101&sessionId=555') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/member/workout/create-session/day/:planDayId" element={<CreateWorkoutDaySessionPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('CreateWorkoutDaySessionPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.getState().setAuth({ userId: '1', email: 'member@example.com', fullName: 'Member', roles: ['member'], memberId: '10' }, 'token')
    vi.mocked(workoutService.getAssignments).mockResolvedValue([assignment])
    vi.mocked(workoutService.getPlan).mockResolvedValue(plan)
    vi.mocked(workoutService.createLog).mockResolvedValue({} as never)
    vi.mocked(trainingSessionService.getSession).mockResolvedValue(session)
  })

  it('renders configured sets read-only, starts the timer, and pauses it before leaving', async () => {
    const day = plan.days![0]
    saveSessionDraft('10', day, assignment, '555', {
      111: {
        sets: [
          { actualReps: '12', actualWeightKg: '25', actualDurationSec: '' },
          { actualReps: '10', actualWeightKg: '22.5', actualDurationSec: '' },
        ],
        restSeconds: 45,
      },
    })
    const storageKey = getSessionDraftStorageKey('10', day, assignment, '555')

    renderPage()

    expect(await screen.findByText('12')).toBeVisible()
    expect(screen.getByText('22.5')).toBeVisible()
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.getByLabelText('Nghỉ 45 giây')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu buổi tập' }))
    const stopButtons = await screen.findAllByRole('button', { name: 'Dừng buổi tập' })
    expect(stopButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('02:45')[0]).toBeVisible()
    expect(screen.getByText('Đang thực hiện buổi tập')).toBeVisible()

    // Test minimizing focus modal
    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }))
    expect(screen.queryByText('Đang thực hiện buổi tập')).toBeNull()
    expect(screen.getByRole('button', { name: 'Mở bảng tập luyện' })).toBeVisible()

    // Reopen modal
    fireEvent.click(screen.getByRole('button', { name: 'Mở bảng tập luyện' }))
    expect(screen.getByText('Đang thực hiện buổi tập')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chọn ngày tập' }))
    expect(screen.getByText('Dừng buổi tập?')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Dừng và rời đi' }))
    expect(workoutService.createLog).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(storageKey)).not.toBeNull()
  })

  it('rejects an invalid assignment/day query without creating a log', async () => {
    renderPage('/member/workout/create-session/day/11?assignmentId=999')
    expect(await screen.findByText('Liên kết ngày tập không hợp lệ hoặc không còn khả dụng.')).toBeVisible()
    expect(workoutService.createLog).not.toHaveBeenCalled()
  })
})
