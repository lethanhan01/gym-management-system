import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkoutSchedulePage from './WorkoutSchedulePage'
import {
  trainingService,
  type TrainingSession,
  type TrainingSessionDetail,
} from '@/services/training.service'

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

function createSession(
  sessionId: string,
  startTime: string,
  trainerName: string,
  status: TrainingSession['status'] = 'scheduled'
): TrainingSession {
  return {
    sessionId,
    memberId: '10',
    memberName: 'Member',
    trainerStaffId: '20',
    trainerName,
    roomId: '30',
    roomName: 'Room A',
    assignmentId: null,
    planDayId: null,
    workoutPlan: null,
    planDay: null,
    startTime,
    endTime: startTime,
    status,
  }
}

describe('WorkoutSchedulePage deep links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the session detail modal from the sessionId query parameter', async () => {
    vi.mocked(trainingService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingService.getSession).mockResolvedValue(sessionDetail)

    renderPage()

    await waitFor(() => expect(trainingService.getSession).toHaveBeenCalledWith('123'))
    expect(await screen.findByText('Chi tiết buổi tập')).toBeVisible()
    expect(screen.getByText('Trainer A')).toBeVisible()
    expect(screen.getByText('Room A')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeVisible()
  })

  it('ignores malformed sessionId query parameters', async () => {
    vi.mocked(trainingService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingService.getSession).mockResolvedValue(sessionDetail)

    renderPage('/member/workout/sessions?sessionId=https://evil.example')

    await screen.findByText('Lịch của tôi')
    expect(trainingService.getSession).not.toHaveBeenCalled()
  })

  it('keeps past sessions on the calendar but excludes them from upcoming sections', async () => {
    const now = new Date('2026-07-18T08:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)

    vi.mocked(trainingService.getSessions)
      .mockResolvedValueOnce({
        data: [
          createSession('1', '2026-07-18T07:00:00.000Z', 'Past Trainer'),
          createSession('2', '2026-07-18T08:00:00.000Z', 'Current Trainer'),
          createSession('3', '2026-07-18T09:00:00.000Z', 'Next Trainer'),
          createSession('4', '2026-07-18T10:00:00.000Z', 'Later Trainer'),
        ],
        total: 4,
      })
      .mockResolvedValueOnce({
        data: [
          createSession(
            '5',
            '2026-07-18T06:00:00.000Z',
            'Past Progress Trainer',
            'in_progress'
          ),
        ],
        total: 1,
      })
      .mockResolvedValueOnce({ data: [], total: 0 })

    renderPage('/member/workout/sessions')

    await screen.findAllByText('Next Trainer', { exact: false })

    expect(trainingService.getSessions).toHaveBeenNthCalledWith(1, {
      status: 'scheduled',
      pageSize: 50,
      sort: 'start_time:asc',
    })
    expect(trainingService.getSessions).toHaveBeenNthCalledWith(2, {
      status: 'in_progress',
      pageSize: 20,
      sort: 'start_time:asc',
    })

    const nextSessionCard = screen.getByText('Buổi tập kế tiếp').closest('button')
    const upcomingSection = screen.getByText('Lịch sắp tới').closest('section')
    expect(nextSessionCard).toHaveTextContent('Next Trainer')
    expect(nextSessionCard).not.toHaveTextContent('Later Trainer')
    expect(upcomingSection).toHaveTextContent('Later Trainer')
    expect(upcomingSection).not.toHaveTextContent('Past Trainer')
    expect(upcomingSection).not.toHaveTextContent('Current Trainer')
    expect(upcomingSection).not.toHaveTextContent('Past Progress Trainer')
    expect(screen.getAllByText('Past Trainer', { exact: false })[0]).toBeInTheDocument()
    expect(screen.getAllByText('Current Trainer', { exact: false })[0]).toBeInTheDocument()
    expect(screen.getAllByText('Past Progress Trainer', { exact: false })[0]).toBeInTheDocument()
  })
})
