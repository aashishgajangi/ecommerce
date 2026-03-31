import api from './client'
import type { Cart } from '../types'

export const cartApi = {
  get: () => api.get<Cart>('/cart'),

  addItem: (data: { product_id: number; variant_id?: number; quantity: number }) =>
    api.post<Cart>('/cart/items', data),

  updateItem: (cartItemId: number, quantity: number) =>
    api.put<Cart>(`/cart/items/${cartItemId}`, { quantity }),

  removeItem: (cartItemId: number) =>
    api.delete<Cart>(`/cart/items/${cartItemId}`),

  clear: () => api.delete<Cart>('/cart'),

  applyCoupon: (code: string) =>
    api.post<Cart>('/cart/coupon', { code }),

  removeCoupon: () =>
    api.delete<Cart>('/cart/coupon'),
}
