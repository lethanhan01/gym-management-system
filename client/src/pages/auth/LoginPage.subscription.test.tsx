import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import DashboardLayout from '@/layouts/DashboardLayout'
import SubscriptionRequired from '@/components/shared/SubscriptionRequired'
import { authService } from '@/services/auth.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('@/components/shared/Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('@/components/shared/Topbar', () => ({ default: () => <div>Topbar</div> }))
vi.mock('@/hooks/useSubscriptionExpiry', () => ({ useSubscriptionExpiry: vi.fn() }))
vi.mock('@/services/auth.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/auth.service')>(
    '@/services/auth.service'
  )
  return {
    ...actual,
    authService: { ...actual.authService, login: vi.fn(), me: vi.fn() },
  }
})
vi.mock('@/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/subscription.service')>(
    '@/services/subscription.service'
  )
  return {
    ...actual,
    default: { ...actual.default, getByMember: vi.fn() },
  }
})

const mockedLogin = vi.mocked(authService.login)
const mockedGetByMember = vi.mocked(subscriptionService.getByMember)

describe('LoginPage subscription handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
  })

  it('reuses the successful login check when DashboardLayout mounts', async () => {
    mockedLogin.mockResolvedValue({
      token: 'token',
      user: {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '10',
      },
    })
    mockedGetByMember.mockResolvedValue([makeSubscription({ endDate: '2099-01-01' })])
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<DashboardLayout />}>
            <Route element={<SubscriptionRequired />}>
              <Route index element={<div>Member destination</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText('Member destination')
    await waitFor(() => expect(useSubscriptionStore.getState().status).toBe('success'))
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
  })

  it('hands a failed check to the error guard without issuing a second request', async () => {
    mockedLogin.mockResolvedValue({
      token: 'token',
      user: {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '10',
      },
    })
    mockedGetByMember.mockRejectedValue({ isAxiosError: true, response: { status: 403 } })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<DashboardLayout />}>
            <Route element={<SubscriptionRequired />}>
              <Route index element={<div>Member destination</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText(/không có quyền đọc thông tin gói tập/i)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
  })
})
