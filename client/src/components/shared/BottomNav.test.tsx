import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useWorkoutSessionControlStore } from '@/stores/workoutSessionControlStore'
import BottomNav from './BottomNav'

function renderBottomNav(path = '/member') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav component', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
    vi.clearAllMocks()
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member Test',
        roles: ['member'],
        memberId: '10',
      },
      'token'
    )
    useSubscriptionStore.setState({ hasActiveSub: true, status: 'success' })
    useWorkoutSessionControlStore.getState().setControls(null)
  })

  it('renders standard QR check-in center button on dashboard and other non-workout-session pages', () => {
    renderBottomNav('/member')
    const checkInLink = screen.getByRole('link', { name: /Check-in/i })
    expect(checkInLink).toBeInTheDocument()
    expect(checkInLink).toHaveAttribute('href', '/member/check-in')
  })

  it('switches center element to workout Play button on /member/workout/create-session/day/:planDayId route', () => {
    const startTimer = vi.fn()
    useWorkoutSessionControlStore.getState().setControls({
      status: 'idle',
      startTimer,
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      retrySave: vi.fn(),
    })

    renderBottomNav('/member/workout/create-session/day/2?assignmentId=3&sessionId=1')

    // QR checkin should not be present
    expect(screen.queryByRole('link', { name: /Check-in/i })).not.toBeInTheDocument()

    // Start workout button should be present
    const playBtn = screen.getByRole('button', { name: /Bắt đầu buổi tập/i })
    expect(playBtn).toBeInTheDocument()

    fireEvent.click(playBtn)
    expect(startTimer).toHaveBeenCalledTimes(1)
  })

  it('switches center element to Pause button when workout status is running', () => {
    const pauseTimer = vi.fn()
    useWorkoutSessionControlStore.getState().setControls({
      status: 'running',
      startTimer: vi.fn(),
      pauseTimer,
      resumeTimer: vi.fn(),
      retrySave: vi.fn(),
    })

    renderBottomNav('/member/workout/create-session/day/5?assignmentId=99')

    const pauseBtn = screen.getByRole('button', { name: /Dừng buổi tập/i })
    expect(pauseBtn).toBeInTheDocument()

    fireEvent.click(pauseBtn)
    expect(pauseTimer).toHaveBeenCalledTimes(1)
  })

  it('switches center element to Resume button when workout status is paused', () => {
    const resumeTimer = vi.fn()
    useWorkoutSessionControlStore.getState().setControls({
      status: 'paused',
      startTimer: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer,
      retrySave: vi.fn(),
    })

    renderBottomNav('/member/workout/create-session/day/5?assignmentId=99')

    const resumeBtn = screen.getByRole('button', { name: /Tiếp tục buổi tập/i })
    expect(resumeBtn).toBeInTheDocument()

    fireEvent.click(resumeBtn)
    expect(resumeTimer).toHaveBeenCalledTimes(1)
  })

  it('switches center element to Retry button when workout status is save-error', () => {
    const retrySave = vi.fn()
    useWorkoutSessionControlStore.getState().setControls({
      status: 'save-error',
      startTimer: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      retrySave,
    })

    renderBottomNav('/member/workout/create-session/day/5?assignmentId=99')

    const retryBtn = screen.getByRole('button', { name: /Thử lưu lại/i })
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(retrySave).toHaveBeenCalledTimes(1)
  })

  it('renders Japanese bilingual labels correctly when language is ja', async () => {
    await i18n.changeLanguage('ja')

    useWorkoutSessionControlStore.getState().setControls({
      status: 'idle',
      startTimer: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      retrySave: vi.fn(),
    })

    const { unmount } = renderBottomNav('/member/workout/create-session/day/5')
    expect(screen.getByRole('button', { name: 'トレーニング開始' })).toBeInTheDocument()
    unmount()

    useWorkoutSessionControlStore.getState().setControls({
      status: 'running',
      startTimer: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      retrySave: vi.fn(),
    })

    renderBottomNav('/member/workout/create-session/day/5')
    expect(screen.getByRole('button', { name: 'セッション停止' })).toBeInTheDocument()
  })
})
