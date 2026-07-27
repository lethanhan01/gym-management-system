import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError, type AxiosResponse } from 'axios'
import LiffEntryPage from './LiffEntryPage'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

const mocks = vi.hoisted(() => ({
  initLiff: vi.fn(),
  lineLogin: vi.fn(),
}))

vi.mock('@/lib/liff', () => ({
  initLiff: mocks.initLiff,
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    lineLogin: mocks.lineLogin,
  },
}))

function LocationView() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>
}

function renderEntry(search = '') {
  window.history.replaceState({}, '', `/liff${search}`)
  return render(
    <MemoryRouter initialEntries={[`/liff${search}`]}>
      <Routes>
        <Route path="/liff" element={<LiffEntryPage />} />
        <Route path="/member/*" element={<LocationView />} />
      </Routes>
    </MemoryRouter>
  )
}

function apiError(code: string) {
  const response = {
    data: { success: false, code, message: 'Server error' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('LiffEntryPage', () => {
  const liff = {
    isLoggedIn: vi.fn(),
    getDecodedIDToken: vi.fn(),
    getIDToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearAuth()
    useSubscriptionStore.getState().clear()
    liff.isLoggedIn.mockReturnValue(true)
    liff.getDecodedIDToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3_600 })
    liff.getIDToken.mockReturnValue('line-id-token')
    mocks.initLiff.mockResolvedValue(liff)
    mocks.lineLogin.mockResolvedValue({
      user: {
        userId: '1',
        email: 'member@example.com',
        fullName: 'Member',
        roles: ['member'],
        memberId: '10',
      },
      token: 'app-jwt',
    })
  })

  it('starts LINE login when the LIFF session is missing', async () => {
    liff.isLoggedIn.mockReturnValue(false)

    renderEntry('?redirect=%2Fmember%2Fworkout')

    await waitFor(() => {
      expect(liff.login).toHaveBeenCalledWith({ redirectUri: window.location.href })
    })
    expect(mocks.lineLogin).not.toHaveBeenCalled()
  })

  it('exchanges a valid LINE ID token and preserves a safe member redirect', async () => {
    renderEntry('?redirect=%2Fmember%2Fworkout')

    expect(await screen.findByTestId('location')).toHaveTextContent('/member/workout')
    expect(mocks.lineLogin).toHaveBeenCalledWith('line-id-token')
    expect(useAuthStore.getState()).toMatchObject({ token: 'app-jwt', isAuthenticated: true })
  })

  it('refreshes an expired LINE ID token before it calls the backend', async () => {
    liff.getDecodedIDToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 1 })

    renderEntry()

    await waitFor(() => {
      expect(liff.logout).toHaveBeenCalledTimes(1)
      expect(liff.login).toHaveBeenCalledWith({ redirectUri: window.location.href })
    })
    expect(mocks.lineLogin).not.toHaveBeenCalled()
  })

  it.each([
    ['LINE_AUTH_FAILED', 'Không thể xác thực với LINE. Vui lòng mở lại LIFF và thử lại.'],
    ['LINE_LOGIN_MEMBER_ONLY', 'Đăng nhập LINE chỉ dành cho hội viên.'],
    ['EMAIL_NOT_VERIFIED', 'Vui lòng xác thực email trước khi đăng nhập LINE.'],
  ])('shows a clear message for %s', async (code, expectedMessage) => {
    mocks.lineLogin.mockRejectedValue(apiError(code))

    renderEntry()

    expect(await screen.findByText(expectedMessage)).toBeVisible()
  })
})
