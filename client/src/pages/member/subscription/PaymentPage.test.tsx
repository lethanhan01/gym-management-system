import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-test-utils'
import PaymentPage from './PaymentPage'
import packageService, { type Package } from '@/services/package.service'
import paymentService from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/services/package.service', () => ({
  default: {
    list: vi.fn(),
  },
}))

vi.mock('@/services/payment.service', () => ({
  default: {
    create: vi.fn(),
  },
}))

vi.mock('@/services/subscription.service', () => ({
  default: {
    create: vi.fn(),
  },
}))

const samplePackages: Package[] = [
  {
    packageId: '101',
    packageCode: 'PKG_BASIC',
    name: 'Gói Cơ Bản',
    durationDays: 30,
    price: '500000',
    benefits: JSON.stringify(['Tủ đồ miễn phí', 'Nước uống']),
    includesPt: false,
    status: 'active',
    stats: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  },
  {
    packageId: '102',
    packageCode: 'PKG_VIP',
    name: 'Gói VIP PT',
    durationDays: 90,
    price: '1500000',
    benefits: JSON.stringify(['Kèm PT 1-1', 'Tủ đồ VIP']),
    includesPt: true,
    status: 'active',
    stats: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  },
]

function renderPaymentPage(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearAuth()
    useSubscriptionStore.getState().clear()
    vi.mocked(packageService.list).mockResolvedValue({
      data: samplePackages,
      meta: { page: 1, pageSize: 10, total: 2 },
    })
  })

  it('TC-PM-01: renders loading skeleton while query is loading', () => {
    vi.mocked(packageService.list).mockImplementation(
      () => new Promise(() => {})
    )
    const { container } = renderPaymentPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('TC-PM-02: renders PageErrorState on failure and calls refetch on retry', async () => {
    vi.mocked(packageService.list).mockRejectedValueOnce(new Error('Network error'))

    renderPaymentPage()

    await waitFor(() => {
      expect(
        screen.getByText('Không thể tải danh sách gói tập. Vui lòng thử lại.')
      ).toBeInTheDocument()
    })

    vi.mocked(packageService.list).mockResolvedValueOnce({
      data: samplePackages,
      meta: { page: 1, pageSize: 10, total: 2 },
    })

    const retryBtn = screen.getByRole('button', { name: /thử lại/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })
  })

  it('TC-PM-03: renders PageEmptyState when active package list is empty', async () => {
    vi.mocked(packageService.list).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0 },
    })

    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText(/chưa có gói tập nào/i)).toBeInTheDocument()
    })
  })

  it('TC-PM-04: renders active packages cards with details, price, and benefits', async () => {
    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
      expect(screen.getByText('Gói VIP PT')).toBeInTheDocument()
    })

    expect(screen.getByText(/^500\.000/)).toBeInTheDocument()
    expect(screen.getByText(/^1\.500\.000/)).toBeInTheDocument()
    expect(screen.getByText('Tủ đồ miễn phí')).toBeInTheDocument()
    expect(screen.getByText('Kèm PT 1-1')).toBeInTheDocument()
  })

  it('TC-PM-05: selects package and opens payment method panel with correct summary', async () => {
    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Xác nhận thanh toán')).toBeInTheDocument()
      expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument()
    })
  })

  it('TC-PM-06: redirects to login if user unauthenticated when clicking pay', async () => {
    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    const payButton = screen.getByRole('button', { name: /thanh toán/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/member/payment')
    })
  })

  it('TC-PM-07: completes successful checkout, updates store, invalidates queries and redirects', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member Test',
        roles: ['member'],
        memberId: '10',
      },
      'fake-token'
    )

    vi.mocked(subscriptionService.create).mockResolvedValue({
      subscriptionId: '99',
      memberId: '10',
      packageId: '101',
      packageName: 'Gói Cơ Bản',
      package: null,
      trainerId: null,
      trainerName: null,
      startDate: '2026-06-01',
      endDate: '2026-07-01',
      status: 'active',
      daysLeft: 30,
      cancelledAt: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    })

    vi.mocked(paymentService.create).mockResolvedValue({
      success: true,
      data: {
        paymentId: '88',
        memberId: 10,
        subscriptionId: 99,
        amount: 500000,
        method: 'cash',
        status: 'completed',
      },
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderPaymentPage(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    const payButton = screen.getByRole('button', { name: /thanh toán/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(subscriptionService.create).toHaveBeenCalledWith('10', '101')
      expect(paymentService.create).toHaveBeenCalledWith({
        memberId: 10,
        subscriptionId: 99,
        method: 'cash',
        amount: 500000,
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['subscription', 'member', '10'],
      })
      expect(mockNavigate).toHaveBeenCalledWith('/member', {
        state: { paymentSuccess: true },
      })
    })

    expect(useSubscriptionStore.getState().hasActiveSub).toBe(true)
  })

  it('TC-PM-08: handles 401 error during payment by redirecting to login', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member Test',
        roles: ['member'],
        memberId: '10',
      },
      'fake-token'
    )

    vi.mocked(subscriptionService.create).mockRejectedValue({
      response: { status: 401 },
    })

    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    const payButton = screen.getByRole('button', { name: /thanh toán/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/member/payment')
    })
  })

  it('TC-PM-09: handles 409 conflict error by redirecting to current package page', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member Test',
        roles: ['member'],
        memberId: '10',
      },
      'fake-token'
    )

    vi.mocked(subscriptionService.create).mockRejectedValue({
      response: { status: 409 },
    })

    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    const payButton = screen.getByRole('button', { name: /thanh toán/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/member/subscription/current')
    })
  })

  it('TC-PM-10: handles general error during payment by displaying Alert error message', async () => {
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member Test',
        roles: ['member'],
        memberId: '10',
      },
      'fake-token'
    )

    vi.mocked(subscriptionService.create).mockRejectedValue({
      response: {
        status: 500,
        data: { message: 'Lỗi cổng thanh toán' },
      },
    })

    renderPaymentPage()

    await waitFor(() => {
      expect(screen.getByText('Gói Cơ Bản')).toBeInTheDocument()
    })

    const selectButtons = screen.getAllByRole('button', { name: /chọn gói này/i })
    fireEvent.click(selectButtons[0])

    const payButton = screen.getByRole('button', { name: /thanh toán/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(screen.getByText('Lỗi cổng thanh toán')).toBeInTheDocument()
    })
  })
})
