import api from './client'
import type { User } from '../types'

export interface SavedAddress {
  id: number
  label: string | null
  name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
  type: string
}

export const profileApi = {
  get: () => api.get<User>('/profile'),
  update: (data: { name?: string; phone?: string }) => api.put<User>('/profile', data),
  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.put('/profile/password', data),
}

export const addressApi = {
  list: () => api.get<SavedAddress[]>('/addresses'),
  create: (data: Omit<SavedAddress, 'id' | 'country'> & { country?: string }) =>
    api.post<SavedAddress>('/addresses', data),
  update: (id: number, data: Partial<Omit<SavedAddress, 'id'>>) =>
    api.put<SavedAddress>(`/addresses/${id}`, data),
  remove: (id: number) => api.delete(`/addresses/${id}`),
  setDefault: (id: number) => api.post<SavedAddress>(`/addresses/${id}/default`, {}),
}
