import api from './client'
import type { Category, Product, Brand, PaginatedResponse } from '../types'

export const catalogApi = {
  getHome: () => api.get<{ data: { featured: Product[]; categories: Category[]; banners: unknown[] } }>('/home'),

  getCategories: () => api.get<{ data: Category[] }>('/categories'),

  getCategory: (slug: string) => api.get<{ data: Category }>(`/categories/${slug}`),

  getBrands: () => api.get<{ data: Brand[] }>('/brands'),

  getProducts: (params?: {
    category?: string
    brand?: string
    search?: string
    sort?: string
    page?: number
    per_page?: number
    featured?: boolean
  }) => api.get<PaginatedResponse<Product>>('/products', { params }),

  getProduct: (slug: string) => api.get<{ data: Product }>(`/products/${slug}`),
}
