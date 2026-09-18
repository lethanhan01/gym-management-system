import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useActivePackagesQuery } from './useActivePackagesQuery'
import packageService, { type Package } from '@/services/package.service'
import { createQueryWrapper } from '@/test/query-test-utils'

vi.mock('@/services/package.service', () => ({
  default: {
    list: vi.fn(),
  },
}))

const samplePackages: Package[] = [
  {
    packageId: '1',
    packageCode: 'BASIC',
    name: 'Gói Cơ Bản',
    durationDays: 30,
    price: '300000',
    benefits: 'Tập gym tự do',
    includesPt: false,
    status: 'active',
    stats: null,
    createdAt: '2026-01-01',
    deletedAt: null,
  },
]

describe('useActivePackagesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches active packages successfully', async () => {
    vi.mocked(packageService.list).mockResolvedValue({
      data: samplePackages,
      meta: { page: 1, pageSize: 10, total: 1 },
    })

    const { result } = renderHook(() => useActivePackagesQuery(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(samplePackages)
    expect(packageService.list).toHaveBeenCalledWith({ status: 'active' })
  })

  it('handles query error when packageService fails', async () => {
    vi.mocked(packageService.list).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useActivePackagesQuery(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Network error')
  })
})
