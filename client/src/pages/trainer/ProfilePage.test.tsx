import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrainerProfilePage from './ProfilePage'
import { staffService, type StaffProfile } from '@/services/staff.service'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/staff.service', () => ({
  staffService: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    changePassword: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockProfile: StaffProfile = {
  staffId: '10',
  userId: '2',
  staffCode: 'TR001',
  position: 'trainer',
  fullName: 'Coach John',
  email: 'john@gym.com',
  phone: '0901234567',
  status: 'active',
  specialty: 'Yoga & Pilates',
  experienceYears: 4,
  bio: 'Huấn luyện viên tận tâm với 4 năm kinh nghiệm.',
  avatarFileId: '99',
  avatarUrl: '/api/v1/files/99',
  ratingAverage: 4.8,
  totalReviews: 15,
}

describe('TrainerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().setAuth(
      {
        userId: '2',
        email: 'john@gym.com',
        fullName: 'Coach John',
        roles: ['trainer'],
        staffId: '10',
      },
      'fake-token'
    )
    vi.mocked(staffService.getMe).mockResolvedValue(mockProfile)
  })

  it('renders profile data and member preview card', async () => {
    render(
      <MemoryRouter>
        <TrainerProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Coach John').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('#TR001')).toBeInTheDocument()
    expect(screen.getByText('john@gym.com')).toBeInTheDocument()
    expect(screen.getByText('0901234567')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText(/15/)).toBeInTheDocument()
    expect(screen.queryByText(/vị trí|chức danh/i)).not.toBeInTheDocument()
  })

  it('allows entering edit mode, picking specialty chip, and saving', async () => {
    vi.mocked(staffService.updateMe).mockResolvedValue({
      ...mockProfile,
      fullName: 'Coach John Updated',
      specialty: 'HIIT & Fat Loss',
      experienceYears: 5,
    })

    render(
      <MemoryRouter>
        <TrainerProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Coach John').length).toBeGreaterThan(0)
    })

    // Click edit
    const editBtn = screen.getAllByRole('button', { name: /chỉnh sửa|edit/i })[0]
    fireEvent.click(editBtn)

    // Edit full name
    const nameInput = screen.getByPlaceholderText(/họ và tên|full name/i)
    fireEvent.change(nameInput, { target: { value: 'Coach John Updated' } })

    // Click specialty chip
    const hiitChip = screen.getByRole('button', { name: /hiit/i })
    fireEvent.click(hiitChip)

    // Save
    const saveBtn = screen.getAllByRole('button', { name: /lưu|save/i })[0]
    fireEvent.click(saveBtn)


    await waitFor(() => {
      expect(staffService.updateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Coach John Updated',
          specialty: 'HIIT & Fat Loss',
        })
      )
    })
  })

  it('handles password change submission', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue({ success: true } as any)

    const { container } = render(
      <MemoryRouter>
        <TrainerProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Coach John').length).toBeGreaterThan(0)
    })

    const passwordInputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]')
    expect(passwordInputs.length).toBe(3)

    fireEvent.change(passwordInputs[0], { target: { value: 'OldPass123!' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'NewPass123!' } })
    fireEvent.change(passwordInputs[2], { target: { value: 'NewPass123!' } })

    const submitBtn = screen.getByRole('button', { name: /cập nhật mật khẩu|submit/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith('OldPass123!', 'NewPass123!')
    })
  })

})
