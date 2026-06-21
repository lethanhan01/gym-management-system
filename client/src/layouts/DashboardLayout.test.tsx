import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DashboardLayout from './DashboardLayout'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import { authService } from '@/services/auth.service'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('@/components/shared/Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('@/components/shared/Topbar', () => ({ default: () => <div>Topbar</div> }))
vi.mock('@/hooks/useSubscriptionExpiry', () => ({ useSubscriptionExpiry: vi.fn() }))
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

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/member']}>
      <Routes>
        <Route path="/member" element={<DashboardLayout />}>
          <Route index element={<div>Member page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout subscription orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
