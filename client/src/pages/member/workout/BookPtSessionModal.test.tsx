import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BookPtSessionModal } from './BookPtSessionModal'
import { trainingSessionService, type TrainerAvailabilityData } from '@/services/training-session.service'
import workoutService from '@/services/workout.service'

vi.mock('@/services/training-session.service', () => ({
  trainingSessionService: {
    getTrainerAvailability: vi.fn(),
    bookSession: vi.fn(),
  },
}))

vi.mock('@/services/workout.service', () => ({
  default: {
    getAssignments: vi.fn(),
    getPlan: vi.fn(),
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { memberId: '10', fullName: 'Test Member' },
  }),
}))

const mockAvailability: TrainerAvailabilityData = {
  date: '2026-08-18',
  trainer: {
    staffId: '5',
    fullName: 'Coach Alex',
    avatarFileId: null,
  },
  slots: [
    {
      slotIndex: 1,
      startTime: '2026-08-18T06:00:00.000Z',
      endTime: '2026-08-18T07:00:00.000Z',
      available: true,
    },
    {
      slotIndex: 2,
      startTime: '2026-08-18T07:00:00.000Z',
      endTime: '2026-08-18T08:00:00.000Z',
      available: false,
      reason: 'TRAINER_BUSY',
    },
  ],
}

function renderModal(props: Partial<Parameters<typeof BookPtSessionModal>[0]> = {}) {
  return render(
    <MemoryRouter>
      <BookPtSessionModal
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        scheduledCount={0}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('BookPtSessionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(workoutService.getAssignments).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches and displays trainer name and availability slots', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)

    renderModal({ scheduledCount: 1 })

    await waitFor(() => expect(trainingSessionService.getTrainerAvailability).toHaveBeenCalled())
    expect(screen.getByText('Coach Alex')).toBeInTheDocument()
    expect(screen.getByText('Số buổi hẹn đang chờ: 1/3')).toBeInTheDocument()
    expect(screen.getByText('Còn trống')).toBeInTheDocument()
    expect(screen.getByText('Đã có lịch')).toBeInTheDocument()
  })

  it('selects an available slot and submits booking successfully', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(trainingSessionService.bookSession).mockResolvedValue({
      sessionId: '100',
      memberId: '10',
      memberName: 'Test Member',
      trainerStaffId: '5',
      trainerName: 'Coach Alex',
      roomId: '1',
      roomName: 'Room A',
      assignmentId: null,
      planDayId: null,
      workoutPlan: null,
      planDay: null,
      startTime: mockAvailability.slots[0].startTime,
      endTime: mockAvailability.slots[0].endTime,
      status: 'scheduled',
    })

    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    renderModal({ onClose: handleClose, onSuccess: handleSuccess })

    await waitFor(() => expect(trainingSessionService.getTrainerAvailability).toHaveBeenCalled())

    // Click available slot
    const availableSlotBtn = screen.getByText('Còn trống').closest('button')
    expect(availableSlotBtn).not.toBeNull()
    fireEvent.click(availableSlotBtn!)

    // Submit booking
    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    expect(submitBtn).toBeEnabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(trainingSessionService.bookSession).toHaveBeenCalledWith({
        startTime: mockAvailability.slots[0].startTime,
        endTime: mockAvailability.slots[0].endTime,
        assignmentId: undefined,
        planDayId: undefined,
      })
    })

    expect(handleSuccess).toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
  })

  it('displays friendly message when member has no primary trainer', async () => {
    const error = Object.assign(new Error('No primary trainer'), {
      isAxiosError: true,
      response: { data: { code: 'NO_PRIMARY_TRAINER' } },
    })
    vi.mocked(trainingSessionService.getTrainerAvailability).mockRejectedValue(error)

    renderModal()

    await waitFor(() => expect(trainingSessionService.getTrainerAvailability).toHaveBeenCalled())
    expect(
      screen.getByText(/Bạn chưa được gán PT phụ trách/i)
    ).toBeInTheDocument()
  })

  it('displays subscription warning with CTA button when member has no active subscription', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    const subError = Object.assign(new Error('No active subscription'), {
      isAxiosError: true,
      response: { data: { code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION' } },
    })
    vi.mocked(trainingSessionService.bookSession).mockRejectedValue(subError)

    renderModal()

    await waitFor(() => expect(trainingSessionService.getTrainerAvailability).toHaveBeenCalled())

    // Select slot & submit
    const availableSlotBtn = screen.getByText('Còn trống').closest('button')
    fireEvent.click(availableSlotBtn!)

    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Bạn cần có gói tập đang hoạt động/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Xem các gói tập/i })).toBeInTheDocument()
    })
  })
})
