import api from './client'
import type { User } from '../types'

export const profileApi = {
  get: () => api.get<{ data: User }>('/profile'),

  update: (data: { name?: string; phone?: string }) =>
    api.put<{ data: User }>('/profile', data),

  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.put('/profile/password', data),
}
