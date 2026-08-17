import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SubscriptionSetupPage from './SubscriptionSetupPage'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { makeSubscription } from '@/test/subscriptionFactory'


vi.mock('@/components/PackagePicker', () => ({
  PackagePicker: ({ packages }: { packages: Package[] }) => (
    <div>Packages loaded {packages.length}</div>
  ),
  PackagePickerSkeleton: () => <div>Package skeleton</div>,
}))

vi.mock('@/services/package.service', () => ({
  default: { list: vi.fn() },
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

const mockedListPackages = vi.mocked(packageService.list)
const mockedGetByMember = vi.mocked(subscriptionService.getByMember)

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    packageId: '20',
    packageCode: 'STANDARD',
    name: 'Standard',
    durationDays: 30,
    price: '500000.00',
    benefits: null,
    includesPt: false,
    status: 'active',
    stats: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function setMemberAuth(memberId = '10') {
  useAuthStore.getState().setAuth(
    {
      userId: '1',
      email: 'member@example.com',
      fullName: 'Member',
      roles: ['member'],
      memberId,
    },
    'token'
  )
}

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/member/subscription/setup']}>
      <Routes>
        <Route path="/member" element={<div>Member dashboard</div>} />
        <Route path="/member/subscription/setup" element={<SubscriptionSetupPage />} />
        <Route path="/member/subscription/buy/payment" element={<div>Payment page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SubscriptionSetupPage subscription bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearAuth()
    useSubscriptionStore.getState().clear()
    mockedListPackages.mockResolvedValue({
      data: [makePackage()],
      meta: { page: 1, pageSize: 10, total: 1 },
    })
  })

  it('does not recheck subscription when the store already has inactive status for the current member', async () => {
    setMemberAuth('10')
    useSubscriptionStore.getState().setResolvedStatus(false, '10')

    renderSetup()

    await screen.findByText('Packages loaded 1')
    expect(mockedGetByMember).not.toHaveBeenCalled()
    expect(mockedListPackages).toHaveBeenCalledWith({ status: 'active' })
  })

  it('rechecks when cached inactive status belongs to another member', async () => {
    setMemberAuth('10')
    useSubscriptionStore.getState().setResolvedStatus(false, '99')
    mockedGetByMember.mockResolvedValue([
      makeSubscription({ memberId: '10', status: 'expired', endDate: '2026-06-30' }),
    ])

    renderSetup()

    await screen.findByText('Packages loaded 1')
    expect(mockedGetByMember).toHaveBeenCalledWith('10')
    expect(useSubscriptionStore.getState()).toMatchObject({
      status: 'success',
      hasActiveSub: false,
      checkedMemberId: '10',
    })
  })

  it('redirects to member dashboard when recheck finds an active subscription', async () => {
    setMemberAuth('10')
    mockedGetByMember.mockResolvedValue([
      makeSubscription({ memberId: '10', status: 'active', endDate: '2099-01-01' }),
    ])

    renderSetup()

    await screen.findByText('Member dashboard')
    await waitFor(() => expect(mockedGetByMember).toHaveBeenCalledWith('10'))
  })
})
