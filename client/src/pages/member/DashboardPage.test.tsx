import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MemberDashboardPage from './DashboardPage'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import packageService from '@/services/package.service'
import { trainingService } from '@/services/training.service'
import { memberService } from '@/services/member.service'
import { feedbackService } from '@/services/feedback.service'
import api from '@/services/api'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('@/components/MemberUI', () => ({
  MemberPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MemberPageHeader: ({ title }: { title: React.ReactNode }) => <header>{title}</header>,
}))

vi.mock('@/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/subscription.service')>(
    '@/services/subscription.service'
  )
  return {
    ...actual,
    default: { ...actual.default, getByMember: vi.fn() },
  }
})

vi.mock('@/services/package.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/package.service')>(
    '@/services/package.service'
  )
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn() },
  }
})

vi.mock('@/services/training.service', () => ({
  trainingService: {
    getSessions: vi.fn(),
    getAttendance: vi.fn(),
  },
}))

vi.mock('@/services/member.service', () => ({
  memberService: {
    getProgress: vi.fn(),
    getProfile: vi.fn(),
    selfAssignTrainer: vi.fn(),
  },
}))

vi.mock('@/services/feedback.service', () => ({
  feedbackService: {
    list: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedGetByMember = vi.mocked(subscriptionService.getByMember)
const mockedGetPackage = vi.mocked(packageService.get)
const mockedGetSessions = vi.mocked(trainingService.getSessions)
const mockedGetAttendance = vi.mocked(trainingService.getAttendance)
const mockedGetProgress = vi.mocked(memberService.getProgress)
const mockedGetProfile = vi.mocked(memberService.getProfile)
const mockedListFeedback = vi.mocked(feedbackService.list)
const mockedApiGet = vi.mocked(api.get)

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/member']}>
      <Routes>
        <Route path="/member" element={<MemberDashboardPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MemberDashboardPage subscription access sync', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-07-18T08:00:00.000Z'))
    vi.clearAllMocks()
    localStorage.setItem('gym-locale', 'vi')
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
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

    mockedGetSessions.mockResolvedValue({ data: [], total: 0 })
    mockedGetProgress.mockResolvedValue([])
    mockedGetAttendance.mockResolvedValue({ data: [], total: 0 })
    mockedApiGet.mockResolvedValue({ data: { data: [] } })
    mockedListFeedback.mockResolvedValue({ data: [], total: 0 })
    mockedGetProfile.mockResolvedValue({
      memberId: '10',
      memberCode: 'M001',
      userId: '1',
      fullName: 'Member',
      email: 'member@example.com',
      phone: '0900000000',
      dateOfBirth: null,
      address: null,
      primaryTrainerId: null,
      trainerName: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      subscriptions: [],
    })
    mockedGetPackage.mockResolvedValue({
      packageId: '20',
      packageCode: 'STANDARD',
      name: 'Standard',
      durationDays: 30,
      price: '500000.00',
      status: 'active',
      stats: null,
      benefits: null,
      includesPt: false,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the access store active through the subscription end date', async () => {
    mockedGetByMember.mockResolvedValue([
      makeSubscription({
        status: 'active',
        startDate: '2026-06-18',
        endDate: '2026-07-18',
        daysLeft: 0,
      }),
    ])

    renderDashboard()

    await waitFor(() => {
      expect(useSubscriptionStore.getState().hasActiveSub).toBe(true)
    })
    expect(useSubscriptionStore.getState().checkedMemberId).toBe('10')
  })
})
