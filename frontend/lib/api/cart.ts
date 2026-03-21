import api from './client'
import type { Cart } from '../types'

export const cartApi = {
  get: () => api.get<{ data: Cart }>('/cart'),

  addItem: (data: { product_id: number; variant_id?: number; quantity: number }) =>
    api.post<{ data: Cart }>('/cart/items', data),

  updateItem: (cartItemId: number, quantity: number) =>
    api.put<{ data: Cart }>(`/cart/items/${cartItemId}`, { quantity }),

  removeItem: (cartItemId: number) =>
    api.delete<{ data: Cart }>(`/cart/items/${cartItemId}`),

  clear: () => api.delete('/cart'),

  applyCoupon: (code: string) =>
    api.post<{ data: Cart }>('/cart/coupon', { code }),

  removeCoupon: () =>
    api.delete<{ data: Cart }>('/cart/coupon'),
}
