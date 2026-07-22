import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './LoginPage'
import AuthLayout from '@/layouts/AuthLayout'
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

function PaymentStateProbe() {
  const location = useLocation()
  return <div>Payment state {JSON.stringify(location.state)}</div>
}

describe('LoginPage subscription handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
  })

  it('checks a non-primary member role and reuses the result when DashboardLayout mounts', async () => {
    mockedLogin.mockResolvedValue({
      token: 'token',
      user: {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['staff', 'member'],
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

  it('sends an expired member directly to subscription setup after login', async () => {
    mockedLogin.mockResolvedValue({
      token: 'token',
      user: {
        userId: '5',
        email: 'hoang.van.e@email.com',
        fullName: 'Hoang Van E',
        roles: ['member'],
        memberId: '15',
      },
    })
    mockedGetByMember.mockResolvedValue([
      makeSubscription({
        memberId: '15',
        status: 'expired',
        endDate: '2026-06-30',
      }),
    ])
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="/member" element={<DashboardLayout />}>
            <Route index element={<div>Member dashboard</div>} />
            <Route path="subscription/setup" element={<div>Subscription setup</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'hoang.van.e@email.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText('Subscription setup')
    expect(screen.queryByText('Member dashboard')).not.toBeInTheDocument()
    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: false,
      checkedMemberId: '15',
    })
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
  })

  it('checks subscription with the new token even when stale auth is stored', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: 'old',
        email: 'old@example.com',
        fullName: 'Old User',
        roles: ['member'],
        memberId: '99',
      },
      'stale-token'
    )
    mockedLogin.mockResolvedValue({
      token: 'fresh-token',
      user: {
        userId: '5',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '15',
      },
    })
    mockedGetByMember.mockResolvedValue([makeSubscription({ memberId: '15', endDate: '2099-01-01' })])
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<div>Member destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText('Member destination')
    expect(mockedGetByMember).toHaveBeenCalledWith('15', {
      accessToken: 'fresh-token',
      suppressAuthRedirect: true,
    })
  })

  it('does not authenticate or enter member routes when login-time subscription check returns 401', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: 'old',
        email: 'old@example.com',
        fullName: 'Old User',
        roles: ['member'],
        memberId: '99',
      },
      'stale-token'
    )
    mockedLogin.mockResolvedValue({
      token: 'fresh-token',
      user: {
        userId: '5',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '15',
      },
    })
    mockedGetByMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<div>Member destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText('Email hoặc mật khẩu không đúng.')
    expect(screen.queryByText('Member destination')).not.toBeInTheDocument()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useSubscriptionStore.getState().status).toBe('idle')
  })

  it('continues a pending subscription with package data at payment checkout', async () => {
    mockedLogin.mockResolvedValue({
      token: 'token',
      user: {
        userId: '5',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '15',
      },
    })
    mockedGetByMember.mockResolvedValue([
      makeSubscription({
        memberId: '15',
        subscriptionId: '44',
        packageId: '20',
        status: 'pending',
        package: {
          packageId: '20',
          packageCode: 'STANDARD',
          name: 'Standard',
          durationDays: 30,
          price: '500000.00',
          status: 'active',
        },
      }),
    ])
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member/subscription/buy/payment" element={<PaymentStateProbe />} />
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await screen.findByText(/Payment state/)
    expect(screen.getByText(/"packageId":"20"/)).toBeVisible()
    expect(screen.getByText(/"packageName":"Standard"/)).toBeVisible()
    expect(screen.getByText(/"price":500000/)).toBeVisible()
    expect(screen.getByText(/"subscriptionId":"44"/)).toBeVisible()
    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: false,
      checkedMemberId: '15',
    })
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

  it('does not authenticate while the subscription check is still pending', async () => {
    let rejectCheck: ((reason?: unknown) => void) | undefined
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
    mockedGetByMember.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectCheck = reject
        })
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<div>Member destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(mockedGetByMember).toHaveBeenCalledTimes(1))

    expect(useAuthStore.getState().user).toBeNull()

    act(() => rejectCheck?.(new Error('request failed')))
    await screen.findByText('Member destination')
  })

  it('hands a transient failed check to the retry guard without rendering dashboard content', async () => {
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
    mockedGetByMember.mockRejectedValue({ isAxiosError: true })
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

    await screen.findByText(/Không thể kết nối đến máy chủ/i)
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible()
    expect(screen.queryByText('Member destination')).not.toBeInTheDocument()
    expect(mockedGetByMember).toHaveBeenCalledTimes(1)
  })
})
