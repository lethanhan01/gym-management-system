import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SubscriptionRequired from './SubscriptionRequired'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useAuthStore } from '@/stores/authStore'

const originalRetry = useSubscriptionStore.getState().retry

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/member']}>
      <Routes>
        <Route element={<SubscriptionRequired />}>
          <Route path="/member" element={<div>Member content</div>} />
        </Route>
        <Route path="/member/subscription/setup" element={<div>Subscription setup</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SubscriptionRequired', () => {
  beforeEach(() => {
    localStorage.setItem('gym-locale', 'vi')
    useSubscriptionStore.setState({ retry: originalRetry })
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
  })

  it('shows a labelled spinner only while access is unresolved', () => {
    useSubscriptionStore.setState({ status: 'loading', checkedMemberId: '10' })
    renderGuard()

    expect(screen.getByRole('status', { name: 'Đang kiểm tra quyền truy cập gói tập' })).toBeVisible()
    expect(screen.queryByText('Member content')).not.toBeInTheDocument()
  })

  it('renders member content after a successful active result', () => {
    useSubscriptionStore.setState({ status: 'success', hasActiveSub: true, checkedMemberId: '10' })
    renderGuard()

    expect(screen.getByText('Member content')).toBeVisible()
  })

  it('redirects a resolved inactive member to setup', () => {
    useSubscriptionStore.setState({ status: 'success', hasActiveSub: false, checkedMemberId: '10' })
    renderGuard()

    expect(screen.getByText('Subscription setup')).toBeVisible()
  })

  it('shows a retryable terminal error instead of an endless spinner', () => {
    const retry = vi.fn().mockImplementation(async () => {
      useSubscriptionStore.setState({ status: 'success', hasActiveSub: true, errorCode: null })
      return { subscriptions: [], hasActiveSub: true }
    })
    useSubscriptionStore.setState({
      status: 'error',
      hasActiveSub: null,
      errorCode: 'network',
      checkedMemberId: '10',
      retry,
    })
    renderGuard()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Member content')).toBeVisible()
  })

  it('offers logout when the member profile is missing', () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: null,
      },
      'token'
    )
    useSubscriptionStore.setState({
      status: 'error',
      errorCode: 'missing_member_profile',
      checkedMemberId: null,
    })
    renderGuard()

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(screen.getByText('Login page')).toBeVisible()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useSubscriptionStore.getState().status).toBe('idle')
  })
})
