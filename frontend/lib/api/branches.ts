import api from './client'
import type { Branch, NearbyBranch, DeliveryOptionsResponse } from '../types'

export const branchApi = {
  list: () => api.get<Branch[]>('/branches'),

  get: (slug: string) => api.get<Branch>(`/branches/${slug}`),

  nearby: (lat: number, lng: number) =>
    api.get<NearbyBranch[]>('/branches/nearby', { params: { lat, lng } }),

  deliveryOptions: (lat: number, lng: number, order_total?: number, show_all?: boolean) =>
    api.post<DeliveryOptionsResponse>('/delivery/options', { lat, lng, order_total, show_all }),
}
