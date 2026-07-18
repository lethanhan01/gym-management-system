import { beforeEach, describe, expect, it } from 'vitest'
import { AxiosHeaders } from 'axios'
import api from './api'
import { useAuthStore } from '@/stores/authStore'

function setStoredAuth(token: string) {
  useAuthStore.getState().setAuth(
    {
      userId: '1',
      email: 'member@example.com',
      fullName: 'Member',
      roles: ['member'],
      memberId: '10',
    },
    token
  )
}

describe('api auth interceptors', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('does not overwrite an explicit Authorization header with the stored token', async () => {
    setStoredAuth('stale-token')
    let seenHeaders: Parameters<typeof AxiosHeaders.from>[0] = undefined

    await api.get('/subscriptions/member/10', {
      headers: { Authorization: 'Bearer fresh-token' },
      adapter: async (config) => {
        seenHeaders = config.headers
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      },
    })

    const headers = AxiosHeaders.from(seenHeaders)
    expect(headers.get('Authorization')).toBe('Bearer fresh-token')
  })

  it('keeps auth state when a suppressed bootstrap request receives 401', async () => {
    setStoredAuth('fresh-token')

    await expect(
      api.get('/subscriptions/member/10', {
        suppressAuthRedirect: true,
        adapter: async (config) =>
          Promise.reject({
            isAxiosError: true,
            config,
            response: { status: 401 },
          }),
      })
    ).rejects.toMatchObject({ response: { status: 401 } })

    expect(useAuthStore.getState().token).toBe('fresh-token')
    expect(useAuthStore.getState().user?.userId).toBe('1')
  })
})
