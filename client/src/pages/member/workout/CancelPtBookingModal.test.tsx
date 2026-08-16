import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CancelPtBookingModal } from './CancelPtBookingModal'
import { trainingSessionService, type TrainingSession } from '@/services/training-session.service'

vi.mock('@/services/training-session.service', () => ({
  trainingSessionService: {
    cancelBooking: vi.fn(),
  },
}))

const makeScheduledSession = (offsetHours: number): TrainingSession => ({
  sessionId: '55',
  memberId: '10',
  memberName: 'Test Member',
  trainerStaffId: '5',
  trainerName: 'Coach Alex',
  roomId: '1',
  roomName: 'Room 1',
  assignmentId: null,
  planDayId: null,
  workoutPlan: null,
  planDay: null,
  startTime: new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + (offsetHours + 1) * 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
})

describe('CancelPtBookingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders reason textarea and cancels successfully when time is >= 2 hours', async () => {
    const session = makeScheduledSession(3) // 3 hours in future
    vi.mocked(trainingSessionService.cancelBooking).mockResolvedValue({
      success: true,
      message: 'Cancelled',
    })

    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    render(
      <CancelPtBookingModal
        open={true}
        session={session}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    )

    expect(screen.getByText('Coach Alex')).toBeInTheDocument()
    const textarea = screen.getByPlaceholderText(/Ví dụ: Bận việc đột xuất/i)
    expect(textarea).toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: 'Bận việc gia đình' } })

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận hủy/i })
    expect(confirmBtn).toBeEnabled()
    fireEvent.click(confirmBtn)

    await waitFor(() => {
    expect(trainingSessionService.cancelBooking).toHaveBeenCalledWith('55', 'Bận việc gia đình')
    })

    expect(handleSuccess).toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
  })

  it('displays warning and hides cancel button when session starts in < 2 hours', () => {
    const session = makeScheduledSession(1) // 1 hour in future (< 2h)

    render(
      <CancelPtBookingModal
        open={true}
        session={session}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(
      screen.getByText(/Buổi tập diễn ra trong vòng 2 giờ tới/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Xác nhận hủy/i })
    ).not.toBeInTheDocument()
  })
})
