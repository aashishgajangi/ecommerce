import api from './client'
import type { Product } from '../types'

export const wishlistApi = {
  list: () => api.get<{ data: Product[] }>('/wishlist'),
  toggle: (productId: number) => api.post<{ wishlisted: boolean }>(`/wishlist/${productId}`),
}
