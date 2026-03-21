import api from './client'
import type { Order, PaginatedResponse } from '../types'

export const ordersApi = {
  list: (page = 1) =>
    api.get<PaginatedResponse<Order>>('/orders', { params: { page } }),

  get: (id: number) =>
    api.get<{ data: Order }>(`/orders/${id}`),

  cancel: (id: number) =>
    api.post(`/orders/${id}/cancel`),
}
