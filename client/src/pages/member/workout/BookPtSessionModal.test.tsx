import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BookPtSessionModal } from './BookPtSessionModal'
import {
  trainingSessionService,
  type MemberActivePlanBookingData,
  type TrainerAvailabilityData,
} from '@/services/training-session.service'

vi.mock('@/services/training-session.service', () => ({
  trainingSessionService: {
    getTrainerAvailability: vi.fn(),
    getActivePlanDaysForBooking: vi.fn(),
    bookSession: vi.fn(),
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

const mockPlanBookingData: MemberActivePlanBookingData = {
  hasPtBenefit: true,
  hasActivePlan: true,
  allCompletedOrScheduled: false,
  trainerStaffId: '5',
  assignmentId: '50',
  planId: '20',
  planName: 'Hypertrophy 4-Day Split',
  days: [
    {
      planDayId: '101',
      dayNumber: 1,
      weekNumber: 1,
      dayOfWeek: 1,
      name: 'Push Day - Ngực & Tay sau',
      notes: 'Khởi động kỹ',
      exerciseCount: 5,
      status: 'available',
    },
    {
      planDayId: '102',
      dayNumber: 2,
      weekNumber: 1,
      dayOfWeek: 2,
      name: 'Pull Day - Lưng & Tay trước',
      notes: null,
      exerciseCount: 4,
      status: 'completed',
    },
    {
      planDayId: '103',
      dayNumber: 3,
      weekNumber: 1,
      dayOfWeek: 3,
      name: 'Leg Day - Chân & Mông',
      notes: null,
      exerciseCount: 6,
      status: 'scheduled',
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
    vi.mocked(trainingSessionService.getActivePlanDaysForBooking).mockResolvedValue(mockPlanBookingData)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches and displays trainer name, availability slots, and plan days with status badges', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)

    renderModal({ scheduledCount: 1 })

    await waitFor(() => expect(trainingSessionService.getTrainerAvailability).toHaveBeenCalled())
    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    expect(screen.getByText('Coach Alex')).toBeInTheDocument()
    expect(screen.getByText('Số buổi hẹn đang chờ: 1/3')).toBeInTheDocument()
    expect(screen.getByText('Còn trống')).toBeInTheDocument()
    expect(screen.getByText('Đã có lịch')).toBeInTheDocument()

    // Workout plan section
    expect(screen.getByText('Hypertrophy 4-Day Split')).toBeInTheDocument()
    expect(screen.getByText('Push Day - Ngực & Tay sau')).toBeInTheDocument()
    expect(screen.getByText('Pull Day - Lưng & Tay trước')).toBeInTheDocument()
    expect(screen.getByText('Leg Day - Chân & Mông')).toBeInTheDocument()

    // Badges
    expect(screen.getByText('Sẵn sàng')).toBeInTheDocument()
    expect(screen.getByText('Đã tập xong')).toBeInTheDocument()
    expect(screen.getByText('Đã có lịch hẹn')).toBeInTheDocument()

    // Completed & Scheduled days should be disabled
    const pushDayBtn = screen.getByText('Push Day - Ngực & Tay sau').closest('button')
    const pullDayBtn = screen.getByText('Pull Day - Lưng & Tay trước').closest('button')
    const legDayBtn = screen.getByText('Leg Day - Chân & Mông').closest('button')

    expect(pushDayBtn).toBeEnabled()
    expect(pullDayBtn).toBeDisabled()
    expect(legDayBtn).toBeDisabled()
  })

  it('selects an available slot and an available plan day, then submits booking successfully', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(trainingSessionService.bookSession).mockResolvedValue({
      sessionId: '100',
      memberId: '10',
      memberName: 'Test Member',
      trainerStaffId: '5',
      trainerName: 'Coach Alex',
      roomId: '1',
      roomName: 'Room A',
      assignmentId: '50',
      planDayId: '101',
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
    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    // Submit button must be disabled initially
    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    expect(submitBtn).toBeDisabled()

    // Click available slot
    const availableSlotBtn = screen.getByText('Còn trống').closest('button')
    fireEvent.click(availableSlotBtn!)

    // Submit button still disabled because no plan day selected yet
    expect(submitBtn).toBeDisabled()

    // Click available plan day
    const pushDayBtn = screen.getByText('Push Day - Ngực & Tay sau').closest('button')
    fireEvent.click(pushDayBtn!)

    // Now submit button is enabled
    expect(submitBtn).toBeEnabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(trainingSessionService.bookSession).toHaveBeenCalledWith({
        startTime: mockAvailability.slots[0].startTime,
        endTime: mockAvailability.slots[0].endTime,
        assignmentId: '50',
        planDayId: '101',
      })
    })

    expect(handleSuccess).toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
  })

  it('displays warning banner and CTA button when subscription does not include PT benefit', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(trainingSessionService.getActivePlanDaysForBooking).mockResolvedValue({
      hasPtBenefit: false,
      subscriptionReason: 'SUBSCRIPTION_WITHOUT_PT',
      hasActivePlan: false,
      allCompletedOrScheduled: false,
      trainerStaffId: '5',
      days: [],
    })

    renderModal()

    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    expect(screen.getByText(/Gói tập hiện tại của bạn không bao gồm quyền lợi Huấn Luyện Viên Cá Nhân/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nâng cấp gói tập/i })).toBeInTheDocument()

    // Confirm button is disabled
    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    expect(submitBtn).toBeDisabled()
  })

  it('displays warning banner and CTA button when member has no active plan from primary trainer', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(trainingSessionService.getActivePlanDaysForBooking).mockResolvedValue({
      hasPtBenefit: true,
      hasActivePlan: false,
      allCompletedOrScheduled: false,
      trainerStaffId: '5',
      days: [],
    })

    renderModal()

    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    expect(screen.getByText(/Bạn chưa có giáo án tập luyện nào do Huấn luyện viên phụ trách phân công/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xem giáo án/i })).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    expect(submitBtn).toBeDisabled()
  })

  it('displays warning banner when all plan days are completed or scheduled', async () => {
    vi.mocked(trainingSessionService.getTrainerAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(trainingSessionService.getActivePlanDaysForBooking).mockResolvedValue({
      hasPtBenefit: true,
      hasActivePlan: true,
      allCompletedOrScheduled: true,
      trainerStaffId: '5',
      assignmentId: '50',
      planId: '20',
      planName: 'Hypertrophy 4-Day Split',
      days: [
        {
          planDayId: '101',
          dayNumber: 1,
          weekNumber: 1,
          dayOfWeek: 1,
          name: 'Push Day',
          notes: null,
          exerciseCount: 4,
          status: 'completed',
        },
      ],
    })

    renderModal()

    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    expect(screen.getByText(/Tất cả các ngày trong giáo án hiện tại đã hoàn thành hoặc đang có lịch hẹn chờ tập/i)).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i })
    expect(submitBtn).toBeDisabled()
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
    vi.mocked(trainingSessionService.getActivePlanDaysForBooking).mockResolvedValue({
      hasPtBenefit: false,
      subscriptionReason: 'NO_ACTIVE_SUBSCRIPTION',
      hasActivePlan: false,
      allCompletedOrScheduled: false,
      trainerStaffId: null,
      days: [],
    })

    renderModal()

    await waitFor(() => expect(trainingSessionService.getActivePlanDaysForBooking).toHaveBeenCalled())

    expect(screen.getByText(/Bạn cần có gói tập đang hoạt động/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xem các gói tập/i })).toBeInTheDocument()
  })
})
