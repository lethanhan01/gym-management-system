import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MemberProfilePage from './ProfilePage'
import { memberService, type MemberProfile } from '@/services/member.service'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/member.service', () => ({
  memberService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    me: vi.fn(),
    changePassword: vi.fn(),
    linkLine: vi.fn(),
    unlinkLine: vi.fn(),
  },
}))

vi.mock('@/lib/liff', () => ({
  initLiff: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('MemberProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'test@example.com',
        fullName: 'Le Thanh An',
        roles: ['member'],
        memberId: '10',
      },
      'fake-token'
    )
    vi.mocked(authService.me).mockResolvedValue({
      userId: '1',
      email: 'test@example.com',
      fullName: 'Le Thanh An',
      roles: ['member'],
      memberId: '10',
      lineLinked: false,
    })
  })

  it('renders member profile and displays synthetic line email as badge', async () => {
    const mockData: MemberProfile = {
      memberId: '10',
      userId: '1',
      fullName: 'Le Thanh An',
      memberCode: 'MEM-2026-000009',
      email: 'line_U5fa68e68f0c6691209aed5c21c86@line.user',
      phone: '',
      dateOfBirth: null,
      address: null,
      primaryTrainerId: '99',
      trainerName: 'Tran Quang Minh',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    vi.mocked(memberService.getProfile).mockResolvedValue(mockData)

    render(
      <MemoryRouter>
        <MemberProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('MEM-2026-000009').length).toBeGreaterThan(0)
    })

    // Should display LINE badge and hide raw line email
    expect(screen.getAllByText(/LINE/i).length).toBeGreaterThan(0)
    expect(screen.queryByText('line_U5fa68e68f0c6691209aed5c21c86@line.user')).not.toBeInTheDocument()

    // Should display trainer
    expect(screen.getByText('Tran Quang Minh')).toBeInTheDocument()
  })

  it('opens confirmation modal when clicking logout', async () => {
    const mockData: MemberProfile = {
      memberId: '10',
      userId: '1',
      fullName: 'Le Thanh An',
      memberCode: '2026-000009',
      email: 'user@example.com',
      phone: '0901234567',
      dateOfBirth: '1995-01-01',
      address: 'Hanoi',
      primaryTrainerId: null,
      trainerName: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    vi.mocked(memberService.getProfile).mockResolvedValue(mockData)

    render(
      <MemoryRouter>
        <MemberProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('0901234567')).toBeInTheDocument()
    })

    const logoutButtons = screen.getAllByRole('button', { name: /đăng xuất|ログアウト/i })
    fireEvent.click(logoutButtons[0])

    // Should open modal
    await waitFor(() => {
      expect(screen.getByText(/xác nhận đăng xuất|ログアウトの確認/i)).toBeInTheDocument()
    })
  })

  it('allows editing fullName, dateOfBirth, phone, and address', async () => {
    const mockData: MemberProfile = {
      memberId: '10',
      userId: '1',
      fullName: 'Le Thanh An',
      memberCode: 'MEM-2026-000009',
      email: 'user@example.com',
      phone: '0901234567',
      dateOfBirth: '1995-01-01T00:00:00.000Z',
      address: 'Hanoi',
      primaryTrainerId: null,
      trainerName: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    vi.mocked(memberService.getProfile).mockResolvedValue(mockData)
    vi.mocked(memberService.updateProfile).mockResolvedValue({
      ...mockData,
      fullName: 'Le Thanh B',
      phone: '0987654321',
      dateOfBirth: '1996-02-02T00:00:00.000Z',
      address: 'Danang',
    })

    render(
      <MemoryRouter>
        <MemberProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('0901234567')).toBeInTheDocument()
    })

    // Click edit button
    const editBtn = screen.getByRole('button', { name: /chỉnh sửa|編集/i })
    fireEvent.click(editBtn)

    // Form inputs should be visible
    const nameInput = screen.getByDisplayValue('Le Thanh An')
    fireEvent.change(nameInput, { target: { value: 'Le Thanh B' } })

    const phoneInput = screen.getByDisplayValue('0901234567')
    fireEvent.change(phoneInput, { target: { value: '0987654321' } })

    const saveBtn = screen.getByRole('button', { name: /lưu|保存/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(memberService.updateProfile).toHaveBeenCalledWith('10', expect.objectContaining({
        fullName: 'Le Thanh B',
        phone: '0987654321',
      }))
    })
  })
})

