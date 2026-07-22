import api from './api'
import type { AuthUser } from '@/stores/authStore'

interface ServerLoginData {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
    staffId?: string | null
    memberId?: string | null
  }
}

interface ServerMeData {
  userId: string
  email: string
  fullName: string
  roles: string[]
  status?: string
  phone?: string | null
  staffId?: string | null
  memberId?: string | null
  lineLinked?: boolean
}

export const authService = {
  login: async (email: string, password: string): Promise<{ user: AuthUser; token: string }> => {
    const res = await api.post<{ success: boolean; data: ServerLoginData }>('/auth/login', {
      email,
      password,
    })
    const { accessToken, user } = res.data.data
    return { user: user as AuthUser, token: accessToken }
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },

  forgotPassword: async (email: string): Promise<{ message: string; devOtp?: string }> => {
    const res = await api.post<{ success: boolean; message: string; devOtp?: string }>(
      '/auth/forgot-password',
      { email },
    )
    return res.data
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword })
    return res.data
  },

  me: async (): Promise<AuthUser> => {
    const res = await api.get<{ success: boolean; data: ServerMeData }>('/auth/me')
    return res.data.data as AuthUser
  },

  lineLogin: async (idToken: string): Promise<{ user: AuthUser; token: string }> => {
    const res = await api.post<{ success: boolean; data: ServerLoginData }>('/auth/line-login', {
      idToken,
    })
    const { accessToken, user } = res.data.data
    return { user: user as AuthUser, token: accessToken }
  },

  linkLine: async (idToken: string): Promise<{ lineName: string }> => {
    const res = await api.post<{ success: boolean; data: { lineName: string } }>(
      '/auth/line-link',
      { idToken },
    )
    return res.data.data
  },

  unlinkLine: async (): Promise<void> => {
    await api.delete('/auth/line-link')
  },

  register: async (
    fullName: string,
    phone: string,
    email: string,
    password: string,
    dateOfBirth: string,
    address?: string
  ): Promise<{ userId: string; email: string; message: string }> => {
    const res = await api.post<{
      success: boolean
      data: { userId: string; email: string; message: string }
    }>('/members/self-register', { fullName, phone, email, password, dateOfBirth, address })
    return res.data.data
  },

  verifyEmail: async (email: string, otp: string): Promise<{ message: string }> => {
    const res = await api.post<{ success: boolean; data: { message: string } }>(
      '/auth/verify-email',
      { email, otp }
    )
    return res.data.data
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>(
      '/auth/resend-verify',
      { email },
    )
    return res.data
  },
}
