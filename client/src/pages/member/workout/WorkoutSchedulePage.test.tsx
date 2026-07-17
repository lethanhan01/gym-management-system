import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkoutSchedulePage from './WorkoutSchedulePage'
import { trainingService, type TrainingSessionDetail } from '@/services/training.service'

vi.mock('@/services/training.service', () => ({
  trainingService: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
  },
}))

const sessionDetail: TrainingSessionDetail = {
  sessionId: '123',
  memberId: '10',
  memberName: 'Member',
  trainerStaffId: '20',
  trainerName: 'Trainer A',
  roomId: '30',
  roomName: 'Room A',
  assignmentId: null,
  planDayId: null,
  workoutPlan: null,
  planDay: null,
  startTime: '2026-07-18T10:00:00.000Z',
  endTime: '2026-07-18T11:00:00.000Z',
  status: 'scheduled',
  attendanceLogs: [],
}

function renderPage(path = '/member/workout/sessions?sessionId=123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkoutSchedulePage />
    </MemoryRouter>
  )
}

describe('WorkoutSchedulePage deep links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the session detail modal from the sessionId query parameter', async () => {
    vi.mocked(trainingService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingService.getSession).mockResolvedValue(sessionDetail)

    renderPage()

    await waitFor(() => expect(trainingService.getSession).toHaveBeenCalledWith('123'))
    expect(await screen.findByText('Chi tiết buổi tập')).toBeVisible()
    expect(screen.getByText('Trainer A')).toBeVisible()
    expect(screen.getByText('Room A')).toBeVisible()
  })

  it('ignores malformed sessionId query parameters', async () => {
    vi.mocked(trainingService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingService.getSession).mockResolvedValue(sessionDetail)

    renderPage('/member/workout/sessions?sessionId=https://evil.example')

    await screen.findByText('Lịch của tôi')
    expect(trainingService.getSession).not.toHaveBeenCalled()
  })
})
