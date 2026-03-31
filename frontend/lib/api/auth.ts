import api from './client'
import type { AuthResponse, User } from '../types'

export const authApi = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/auth/reset-password', data),

  verifyEmail: (id: number, hash: string) =>
    api.post('/auth/email/verify', { id, hash }),

  resendVerification: () =>
    api.post('/auth/email/resend'),

  googleRedirectUrl: () =>
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`,
}
