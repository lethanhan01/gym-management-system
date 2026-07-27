import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DashboardLayout from './DashboardLayout'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import { authService } from '@/services/auth.service'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('@/components/shared/Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('@/components/shared/Topbar', () => ({ default: () => <div>Topbar</div> }))
const subscriptionExpiryCallbacks = vi.hoisted(() => [] as Array<() => void>)
const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('@/hooks/useSubscriptionExpiry', () => ({
  useSubscriptionExpiry: vi.fn((callback: () => void) => {
    subscriptionExpiryCallbacks.push(callback)
  }),
}))
vi.mock('@/lib/toast', () => ({ toast: toastMock }))
vi.mock('@/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/subscription.service')>(
    '@/services/subscription.service'
  )
  return {
    ...actual,
    default: { ...actual.default, getByMember: vi.fn() },
  }
})
vi.mock('@/services/auth.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/auth.service')>(
    '@/services/auth.service'
  )
  return {
    ...actual,
    authService: { ...actual.authService, me: vi.fn() },
  }
})

const mockedGetByMember = vi.mocked(subscriptionService.getByMember)
const mockedMe = vi.mocked(authService.me)

function renderLayout(initialEntry = '/member') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/member" element={<DashboardLayout />}>
          <Route index element={<div>Member page</div>} />
          <Route path="profile" element={<div>Profile page</div>} />
          <Route path="subscription/setup" element={<div>Setup page</div>} />
          <Route path="subscription/buy/payment" element={<div>Payment page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout subscription orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscriptionExpiryCallbacks.length = 0
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
  })

  it('checks access when member is not the first role', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['staff', 'member'],
        memberId: '10',
      },
      'token'
    )
    mockedGetByMember.mockResolvedValue([makeSubscription({ endDate: '2099-01-01' })])

    renderLayout()

    await waitFor(() => expect(useSubscriptionStore.getState().status).toBe('success'))
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
    expect(mockedMe).not.toHaveBeenCalled()
  })

  it('refreshes /auth/me once and exposes a missing-profile error', async () => {
    const user = {
      userId: '1',
      email: 'member@example.com',
      fullName: 'Member',
      roles: ['member'] as const,
      memberId: null,
    }
    useAuthStore.getState().setAuth({ ...user, roles: [...user.roles] }, 'token')
    mockedMe.mockResolvedValue({ ...user, roles: [...user.roles] })

    renderLayout()

    await waitFor(() => {
      expect(useSubscriptionStore.getState().errorCode).toBe('missing_member_profile')
    })
    expect(mockedMe).toHaveBeenCalledTimes(1)
    expect(mockedGetByMember).not.toHaveBeenCalled()
  })

  it('forces an expired member from regular member pages to subscription setup', async () => {
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
    mockedGetByMember.mockResolvedValue([
      makeSubscription({ status: 'expired', endDate: '2026-06-30' }),
    ])

    renderLayout('/member/profile')

    await waitFor(() => expect(screen.getByText('Setup page')).toBeVisible())
    expect(screen.queryByText('Profile page')).not.toBeInTheDocument()
  })

  it('keeps subscription setup accessible for an expired member', () => {
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
    useSubscriptionStore.setState({
      status: 'success',
      hasActiveSub: false,
      errorCode: null,
      checkedMemberId: '10',
    })

    renderLayout('/member/subscription/setup')

    expect(screen.getByText('Setup page')).toBeVisible()
    expect(mockedGetByMember).not.toHaveBeenCalled()
  })

  it('notifies the member when the subscription expires', () => {
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
    useSubscriptionStore.setState({
      status: 'success',
      hasActiveSub: true,
      errorCode: null,
      checkedMemberId: '10',
    })

    renderLayout()

    act(() => {
      subscriptionExpiryCallbacks[0]?.()
    })

    expect(toastMock.error).toHaveBeenCalledWith('Gói tập đã hết hạn. Đang chuyển về trang đăng ký...')
  })
})
