import api from './client'

export interface Review {
  id: number
  rating: number
  title: string | null
  body: string | null
  user: { name: string; avatar_url?: string | null }
  created_at: string
}

export interface ReviewsResponse {
  data: Review[]
  meta: { current_page: number; last_page: number; total: number }
}

export const reviewsApi = {
  list: (productId: number, page = 1) =>
    api.get<ReviewsResponse>(`/products/${productId}/reviews`, { params: { page } }),
  submit: (productId: number, payload: { rating: number; title?: string; body?: string }) =>
    api.post<{ data: Review }>(`/products/${productId}/reviews`, payload),
}
