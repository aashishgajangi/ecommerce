// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'admin' | 'customer' | 'wholesale'
  avatar_url?: string
  is_active: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

// ── Catalog ───────────────────────────────────────────────────────────────────
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_path?: string
  sort_order: number
  is_active: boolean
  parent_id?: number
  children?: Category[]
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo_path?: string
  is_active: boolean
}

export interface ProductVariant {
  id: number
  sku: string
  price: number
  wholesale_price?: number
  weight?: number
  is_active: boolean
  stock?: number
}

export interface ProductImage {
  id: number
  path: string
  alt_text?: string
  sort_order: number
  is_primary: boolean
  url: string
}

export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  short_description?: string
  base_price: number
  wholesale_price?: number
  min_wholesale_qty?: number
  is_active: boolean
  is_featured: boolean
  meta_title?: string
  meta_description?: string
  brand?: Brand
  categories?: Category[]
  variants?: ProductVariant[]
  images?: ProductImage[]
  primary_image?: ProductImage
  average_rating?: number
  reviews_count?: number
}

// ── Cart ──────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: number
  product: Product
  variant?: ProductVariant
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  coupon_code?: string
}

// ── Orders ────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: number
  product_name: string
  variant_sku?: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Order {
  id: number
  order_number: string
  status: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  shipping_amount: number
  total: number
  payment_method?: string
  payment_status?: string
  placed_at: string
  items?: OrderItem[]
}

// ── API Pagination ─────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
