import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError, type AxiosResponse } from 'axios'
import LiffEntryPage from './LiffEntryPage'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import i18n from '@/lib/i18n'

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
    getLanguage: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('vi')
    localStorage.clear()
    useAuthStore.getState().clearAuth()
    useSubscriptionStore.getState().clear()
    liff.isLoggedIn.mockReturnValue(true)
    liff.getDecodedIDToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3_600 })
    liff.getIDToken.mockReturnValue('line-id-token')
    liff.getLanguage.mockReturnValue('vi')
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

  it('handles liff.state parameter and redirects to the decoded member route', async () => {
    renderEntry('?liff.state=%3Fredirect%3D%252Fmember%252Fsubscription%252Fsetup')

    expect(await screen.findByTestId('location')).toHaveTextContent('/member/subscription/setup')
    expect(mocks.lineLogin).toHaveBeenCalledWith('line-id-token')
    expect(useAuthStore.getState()).toMatchObject({ token: 'app-jwt', isAuthenticated: true })
  })

  it('does not force logout when getDecodedIDToken returns null', async () => {
    liff.getDecodedIDToken.mockReturnValue(null)

    renderEntry('?redirect=%2Fmember')

    expect(await screen.findByTestId('location')).toHaveTextContent('/member')
    expect(liff.logout).not.toHaveBeenCalled()
    expect(mocks.lineLogin).toHaveBeenCalledWith('line-id-token')
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
  ])('shows a clear message for %s in Vietnamese', async (code, expectedMessage) => {
    mocks.lineLogin.mockRejectedValue(apiError(code))

    renderEntry()

    expect(await screen.findByText(expectedMessage)).toBeVisible()
    expect(screen.getByText('Quay lại đăng nhập')).toBeVisible()
  })

  it.each([
    ['LINE_AUTH_FAILED', 'LINEで認証できません。LIFFを開き直して再試行してください。'],
    ['LINE_LOGIN_MEMBER_ONLY', 'LINEログインは会員のみ利用できます。'],
    ['EMAIL_NOT_VERIFIED', 'LINEでログインする前にメールアドレスを認証してください。'],
  ])('shows a clear message for %s in Japanese', async (code, expectedMessage) => {
    await i18n.changeLanguage('ja')
    localStorage.setItem('gym-locale', 'ja')
    mocks.lineLogin.mockRejectedValue(apiError(code))

    renderEntry()

    expect(await screen.findByText(expectedMessage)).toBeVisible()
    expect(screen.getByText('ログインに戻る')).toBeVisible()
  })

  it('renders loading text and LanguageSwitcher in Vietnamese by default', () => {
    mocks.lineLogin.mockImplementation(() => new Promise(() => {}))

    renderEntry()

    expect(screen.getByText('Đang đăng nhập bằng LINE...')).toBeVisible()
    expect(screen.getByRole('button', { name: /switch to japanese/i })).toBeVisible()
  })

  it('auto-detects Japanese from liff.getLanguage() when gym-locale is not set', async () => {
    liff.getLanguage.mockReturnValue('ja-JP')
    mocks.lineLogin.mockImplementation(() => new Promise(() => {}))

    renderEntry()

    await waitFor(() => {
      expect(i18n.language).toBe('ja')
      expect(localStorage.getItem('gym-locale')).toBe('ja')
    })
    expect(await screen.findByText('LINEでログイン中...')).toBeVisible()
  })

  it('preserves existing gym-locale in localStorage over liff.getLanguage()', async () => {
    localStorage.setItem('gym-locale', 'vi')
    liff.getLanguage.mockReturnValue('ja-JP')
    mocks.lineLogin.mockImplementation(() => new Promise(() => {}))

    renderEntry()

    expect(screen.getByText('Đang đăng nhập bằng LINE...')).toBeVisible()
    expect(i18n.language).toBe('vi')
    expect(localStorage.getItem('gym-locale')).toBe('vi')
  })

  it('allows toggling language using LanguageSwitcher', async () => {
    const user = userEvent.setup()
    mocks.lineLogin.mockImplementation(() => new Promise(() => {}))

    renderEntry()

    expect(screen.getByText('Đang đăng nhập bằng LINE...')).toBeVisible()
    const switchBtn = screen.getByRole('button', { name: /switch to japanese/i })
    await user.click(switchBtn)

    expect(await screen.findByText('LINEでログイン中...')).toBeVisible()
    expect(localStorage.getItem('gym-locale')).toBe('ja')
  })
})
