import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkoutSchedulePage from './WorkoutSchedulePage'
import {
  trainingSessionService,
  type TrainingSession,
  type TrainingSessionDetail,
} from '@/services/training-session.service'

vi.mock('@/services/training-session.service', () => ({
  trainingSessionService: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
    getTrainerAvailability: vi.fn(),
    bookSession: vi.fn(),
    cancelBooking: vi.fn(),
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

describe('WorkoutSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the session detail modal from the sessionId query parameter', async () => {
    vi.mocked(trainingSessionService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingSessionService.getSession).mockResolvedValue(sessionDetail)

    renderPage()

    await waitFor(() => expect(trainingSessionService.getSession).toHaveBeenCalledWith('123'))
    expect(await screen.findByText('Chi tiết buổi tập')).toBeVisible()
    expect(screen.getByText('Trainer A')).toBeVisible()
    expect(screen.getByText('Room A')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hủy lịch hẹn' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeVisible()
  })

  it('renders the book PT session action button in page header', async () => {
    vi.mocked(trainingSessionService.getSessions).mockResolvedValue({ data: [], total: 0 })
    renderPage('/member/workout/sessions')

    expect(await screen.findByRole('button', { name: /Đặt lịch với PT/i })).toBeVisible()
  })

  it('ignores malformed sessionId query parameters', async () => {
    vi.mocked(trainingSessionService.getSessions).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(trainingSessionService.getSession).mockResolvedValue(sessionDetail)

    renderPage('/member/workout/sessions?sessionId=https://evil.example')

    await screen.findByText('Lịch của tôi')
    expect(trainingSessionService.getSession).not.toHaveBeenCalled()
  })

  it('keeps past sessions on the calendar but excludes them from upcoming sections', async () => {
    const now = new Date('2026-07-18T08:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)

    vi.mocked(trainingSessionService.getSessions)
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
    expect(screen.getAllByText('Later Trainer', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Past Trainer')).not.toBeInTheDocument()
    expect(screen.queryByText('Past Progress Trainer')).not.toBeInTheDocument()
  })
})
