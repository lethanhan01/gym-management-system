import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import api, { isLineSession } from './api'
import { useAuthStore } from '@/stores/authStore'
import * as liffModule from '@/lib/liff'

type LiffInstance = Awaited<ReturnType<typeof liffModule.initLiff>>

function getResponseErrorInterceptor() {
  const rejected = api.interceptors.response.handlers?.[0]?.rejected
  if (!rejected) throw new Error('Response error interceptor is not registered')
  return rejected
}

vi.mock('@/lib/liff', () => ({
  initLiff: vi.fn(),
  isLiffMockEnabled: false,
  liff: {
    isLoggedIn: vi.fn(),
    getDecodedIDToken: vi.fn(),
    getIDToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    isInClient: vi.fn(),
  },
}))

describe('api.ts interceptors & silent re-login', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearAuth()

    // Mock window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
      href: 'http://localhost:5173/member/dashboard',
      pathname: '/member/dashboard',
      search: '',
      } as unknown as Location,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('detects LINE session accurately based on authProvider', () => {
    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'test-token',
      'credentials'
    )
    expect(isLineSession()).toBe(false)

    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'test-token',
      'line'
    )
    expect(isLineSession()).toBe(true)
  })

  it('redirects to /login when 401 occurs in credentials session', async () => {
    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'expired-jwt',
      'credentials'
    )

    // Simulate 401 error directly through axios response interceptor
    const interceptor = getResponseErrorInterceptor()

    const error = {
      config: { url: '/member/profile', headers: {} },
      response: { status: 401 },
    }

    await expect(interceptor(error)).rejects.toEqual(error)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(window.location.href).toBe('/login')
  })

  it('triggers silent refresh and replays request on 401 in LINE session', async () => {
    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'expired-jwt',
      'line'
    )

    const mockLiff = {
      isLoggedIn: vi.fn().mockReturnValue(true),
      getDecodedIDToken: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      getIDToken: vi.fn().mockReturnValue('fresh-line-id-token'),
      logout: vi.fn(),
      login: vi.fn(),
    }
    vi.mocked(liffModule.initLiff).mockResolvedValue(mockLiff as unknown as LiffInstance)

    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'new-refreshed-jwt',
          user: { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
        },
      },
    })

    // Spy on api instance to mock the retried request
    vi.spyOn(api, 'request').mockResolvedValueOnce({
      data: { success: true, data: 'retried-result' },
    } as never)

    const interceptor = getResponseErrorInterceptor()

    const error = {
      config: { url: '/member/workout/plan', headers: {} },
      response: { status: 401 },
    }

    await interceptor(error)
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/line-login'),
      { idToken: 'fresh-line-id-token' },
      expect.anything()
    )
    expect(useAuthStore.getState().token).toBe('new-refreshed-jwt')
    expect(useAuthStore.getState().authProvider).toBe('line')
  })

  it('redirects to /liff when silent refresh fails in LINE session', async () => {
    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'expired-jwt',
      'line'
    )

    const mockLiff = {
      isLoggedIn: vi.fn().mockReturnValue(false),
    }
    vi.mocked(liffModule.initLiff).mockResolvedValue(mockLiff as unknown as LiffInstance)

    const interceptor = getResponseErrorInterceptor()

    const error = {
      config: { url: '/member/workout/plan', headers: {} },
      response: { status: 401 },
    }

    await expect(interceptor(error)).rejects.toThrow('LIFF not logged in')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(window.location.href).toBe('/liff?redirect=%2Fmember%2Fdashboard')
  })

  it('queues multiple concurrent 401 requests into a single silent refresh call', async () => {
    useAuthStore.getState().setAuth(
      { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
      'expired-jwt',
      'line'
    )

    const mockLiff = {
      isLoggedIn: vi.fn().mockReturnValue(true),
      getDecodedIDToken: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      getIDToken: vi.fn().mockReturnValue('fresh-line-id-token'),
      logout: vi.fn(),
      login: vi.fn(),
    }
    vi.mocked(liffModule.initLiff).mockResolvedValue(mockLiff as unknown as LiffInstance)

    let resolveLogin: (value: unknown) => void
    const loginPromise = new Promise<unknown>((resolve) => {
      resolveLogin = resolve
    })

    const postSpy = vi.spyOn(axios, 'post').mockReturnValueOnce(loginPromise as never)
    const apiSpy = vi.spyOn(api, 'request').mockResolvedValue({
      data: { success: true },
    } as never)

    const interceptor = getResponseErrorInterceptor()

    const error1 = {
      config: { url: '/member/workout/plan', headers: {} },
      response: { status: 401 },
    }
    const error2 = {
      config: { url: '/member/notifications', headers: {} },
      response: { status: 401 },
    }

    const promise1 = interceptor(error1)
    const promise2 = interceptor(error2)

    // Resolve login
    resolveLogin!({
      data: {
        success: true,
        data: {
          accessToken: 'concurrent-refreshed-jwt',
          user: { userId: '1', email: 'test@gym.local', fullName: 'Test', roles: ['member'] },
        },
      },
    })

    await Promise.all([promise1, promise2])

    // axios.post (/auth/line-login) should only have been called ONCE!
    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(apiSpy).toHaveBeenCalledTimes(2)
  })
})
