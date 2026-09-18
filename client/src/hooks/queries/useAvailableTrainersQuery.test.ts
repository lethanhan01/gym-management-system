import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAvailableTrainersQuery } from './useAvailableTrainersQuery'
import { memberService, type TrainerSummary } from '@/services/member.service'
import { createQueryWrapper } from '@/test/query-test-utils'

vi.mock('@/services/member.service', () => ({
  memberService: {
    getAvailableTrainers: vi.fn(),
  },
}))

const sampleTrainers: TrainerSummary[] = [
  {
    staffId: '1',
    staffCode: 'STF001',
    fullName: 'Trần Văn Mạnh',
    position: 'pt',
    specialty: 'Giảm mỡ & Thể lực',
    experienceYears: 4,
    bio: 'HLV chuyên nghiệp với 4 năm kinh nghiệm.',
    ratingAverage: 4.8,
    totalReviews: 12,
    topTags: ['Nhiệt tình', 'Kỹ thuật tốt'],
  },
]

describe('useAvailableTrainersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches available trainers successfully', async () => {
    vi.mocked(memberService.getAvailableTrainers).mockResolvedValue(sampleTrainers)

    const { result } = renderHook(() => useAvailableTrainersQuery(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(sampleTrainers)
    expect(memberService.getAvailableTrainers).toHaveBeenCalled()
  })

  it('handles query error when memberService fails', async () => {
    vi.mocked(memberService.getAvailableTrainers).mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useAvailableTrainersQuery(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Fetch failed')
  })
})
