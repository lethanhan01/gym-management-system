import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Topbar from './Topbar'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

function renderTopbar() {
  return render(
    <MemoryRouter>
      <Topbar />
    </MemoryRouter>
  )
}

describe('Topbar', () => {
  beforeEach(() => {
    localStorage.setItem('gym-locale', 'vi')
    useAuthStore.getState().clearAuth()
    useSubscriptionStore.getState().clear()
  })

  it('renders memberCode for member role when avatar dropdown is opened', () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Nguyễn Văn A',
        roles: ['member'],
        memberId: '10',
        memberCode: 'MEM-2026-000001',
      },
      'token'
    )

    renderTopbar()

    const avatarBtn = screen.getByText('N')
    fireEvent.click(avatarBtn)

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('MEM-2026-000001')).toBeInTheDocument()
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument()
  })

  it('renders "--" for member role if memberCode is null/undefined', () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Nguyễn Văn B',
        roles: ['member'],
        memberId: '10',
        memberCode: null,
      },
      'token'
    )

    renderTopbar()

    const avatarBtn = screen.getByText('N')
    fireEvent.click(avatarBtn)

    expect(screen.getByText('Nguyễn Văn B')).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument()
  })

  it('renders email for non-member role (staff/trainer/owner)', () => {
    useAuthStore.getState().setAuth(
      {
        userId: '2',
        email: 'staff@example.com',
        fullName: 'Lê Văn C',
        roles: ['staff'],
        staffId: '5',
      },
      'token'
    )

    renderTopbar()

    const avatarBtn = screen.getByText('L')
    fireEvent.click(avatarBtn)

    expect(screen.getByText('Lê Văn C')).toBeInTheDocument()
    expect(screen.getByText('staff@example.com')).toBeInTheDocument()
  })
})
