import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChooseTrainerPage from './ChooseTrainerPage'
import { memberService, type TrainerSummary } from '@/services/member.service'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/services/member.service', () => ({
  memberService: {
    getAvailableTrainers: vi.fn(),
    getTrainerReviews: vi.fn(),
    selfAssignTrainer: vi.fn(),
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
  {
    staffId: '2',
    staffCode: 'STF002',
    fullName: 'Nguyễn Thị Hoa',
    position: 'trainer',
    specialty: 'Yoga & Pilates',
    experienceYears: 2,
    bio: 'Hướng dẫn tập luyện nhẹ nhàng, dẻo dai.',
    ratingAverage: null,
    totalReviews: 0,
    topTags: [],
  },
]

describe('ChooseTrainerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(memberService.getAvailableTrainers).mockResolvedValue(sampleTrainers)
  })

  it('renders available trainers with ratings, specialty, and tags', async () => {
    render(
      <MemoryRouter>
        <ChooseTrainerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Mạnh')).toBeInTheDocument()
      expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument()
    })

    // Ratings & specialty on card
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText(/Giảm mỡ & Thể lực/)).toBeInTheDocument()
    expect(screen.getByText('#Nhiệt tình')).toBeInTheDocument()
    expect(screen.getByText('#Kỹ thuật tốt')).toBeInTheDocument()

    // Trainer without reviews shows new badge
    expect(screen.getByText('Mới')).toBeInTheDocument()
  })

  it('filters trainers by search query', async () => {
    render(
      <MemoryRouter>
        <ChooseTrainerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Mạnh')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Tìm kiếm huấn luyện viên theo tên...')
    fireEvent.change(searchInput, { target: { value: 'Hoa' } })

    await waitFor(() => {
      expect(screen.queryByText('Trần Văn Mạnh')).not.toBeInTheDocument()
      expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument()
    })
  })

  it('opens review modal when clicking view reviews button', async () => {
    vi.mocked(memberService.getTrainerReviews).mockResolvedValue({
      trainer: sampleTrainers[0],
      stats: {
        ratingAverage: 4.8,
        totalReviews: 12,
        ratingCounts: { '5': 10, '4': 2, '3': 0, '2': 0, '1': 0 },
        topTags: ['Nhiệt tình', 'Kỹ thuật tốt'],
      },
      pagination: {
        page: 1,
        pageSize: 5,
        totalReviews: 1,
        totalPages: 1,
        hasMore: false,
      },
      reviews: [
        {
          feedbackId: '101',
          rating: 5,
          content: 'Thầy dạy rất có tâm!',
          tags: ['Nhiệt tình'],
          isAnonymous: false,
          reviewerName: 'Học viên A',
          reviewerAvatarFileId: null,
          createdAt: '2026-08-10T10:00:00Z',
        },
      ],
    })

    render(
      <MemoryRouter>
        <ChooseTrainerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Mạnh')).toBeInTheDocument()
    })

    const viewReviewButtons = screen.getAllByText('Xem chi tiết & đánh giá')
    fireEvent.click(viewReviewButtons[0])

    await waitFor(() => {
      expect(memberService.getTrainerReviews).toHaveBeenCalledWith('1', expect.anything())
      expect(screen.getByText('Thầy dạy rất có tâm!')).toBeInTheDocument()
      expect(screen.getByText('Học viên A')).toBeInTheDocument()
    })
  })

  it('selects trainer and confirms assignment', async () => {
    vi.mocked(memberService.selfAssignTrainer).mockResolvedValue({
      primaryTrainerId: '1',
      trainerName: 'Trần Văn Mạnh',
    })

    render(
      <MemoryRouter>
        <ChooseTrainerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Mạnh')).toBeInTheDocument()
    })

    // Click on trainer card to select
    const card = screen.getByText('Trần Văn Mạnh').closest('article')!
    fireEvent.click(card)

    // Click confirm button
    const chooseBtn = screen.getByRole('button', { name: 'Chọn làm PT của tôi' })
    fireEvent.click(chooseBtn)

    await waitFor(() => {
      expect(memberService.selfAssignTrainer).toHaveBeenCalledWith(1)
      expect(mockNavigate).toHaveBeenCalledWith('/member', { replace: true })
    })
  })
})
