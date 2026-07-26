import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CurrentPackagePage from './CurrentPackagePage'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import paymentService from '@/services/payment.service'
import packageService from '@/services/package.service'
import { makeSubscription } from '@/test/subscriptionFactory'

vi.mock('@/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/subscription.service')>(
    '@/services/subscription.service'
  )
  return {
    ...actual,
    default: { ...actual.default, getByMember: vi.fn(), cancel: vi.fn() },
  }
})

vi.mock('@/services/payment.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/payment.service')>(
    '@/services/payment.service'
  )
  return {
    ...actual,
    default: { ...actual.default, listByMember: vi.fn() },
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

const mockedGetByMember = vi.mocked(subscriptionService.getByMember)
const mockedCancel = vi.mocked(subscriptionService.cancel)
const mockedListByMember = vi.mocked(paymentService.listByMember)
const mockedGetPackage = vi.mocked(packageService.get)
const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@/lib/toast', () => ({ toast: toastMock }))

function renderCurrentPackageWithActivatedState() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/member/subscription/current', state: { justActivated: true } }]}>
      <Routes>
        <Route path="/member/subscription/current" element={<CurrentPackagePage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderCurrentPackage() {
  return render(
    <MemoryRouter initialEntries={['/member/subscription/current']}>
      <Routes>
        <Route path="/member/subscription/current" element={<CurrentPackagePage />} />
        <Route path="/member/subscription/setup" element={<div>Subscription setup</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CurrentPackagePage notification toasts', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
    vi.clearAllMocks()
    useSubscriptionStore.getState().clear()
    useAuthStore.getState().clearAuth()
    mockedGetByMember.mockResolvedValue([makeSubscription({ endDate: '2099-01-01' })])
    mockedListByMember.mockResolvedValue([])
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
    mockedCancel.mockResolvedValue({
      subscriptionId: '1',
      status: 'cancelled',
      cancelledAt: '2026-07-18T00:00:00.000Z',
      endDate: '2026-07-18T00:00:00.000Z',
    })
  })

  it('notifies the member when their subscription is activated', async () => {
    renderCurrentPackageWithActivatedState()

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Gói tập đã được kích hoạt thành công!')
    })
  })

  it('notifies the member when their subscription is cancelled', async () => {
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

    renderCurrentPackage()

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy gói' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }))

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('1'))
    expect(toastMock.success).toHaveBeenCalledWith('Đã hủy gói tập thành công.')
  })
})
