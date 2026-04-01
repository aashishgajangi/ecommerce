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

export interface OrderPayment {
  method: string
  status: string
  gateway?: string
  gateway_order_id?: string
  amount: number
  currency: string
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
  payment?: OrderPayment
  branch?: { id: number; name: string; address?: string; phone?: string } | null
  shipping_address?: {
    name?: string; phone?: string; line1?: string
    city?: string; state?: string; pincode?: string
  } | null
}

// ── Branches ─────────────────────────────────────────────────────────────────
export interface Branch {
  id: number
  name: string
  slug: string
  city: string
  state: string
  pincode: string
  phone?: string
  lat: number | null
  lng: number | null
  service_radius_km: number
  delivery_base_fee: number
  delivery_per_km_fee: number
  free_delivery_above: number | null
  opening_time: string
  closing_time: string
  days_open: string[]
  google_maps_url?: string
  google_place_id?: string
}

export interface NearbyBranch extends Branch {
  address: string
  distance_km: number
  is_estimated: boolean   // true = Haversine fallback (Distance Matrix unavailable), false = real road km
  within_radius: boolean  // false when outside service radius (only in show_all mode)
  delivery_fee: number
  eta_minutes: number | null
}

export interface DeliveryOptionsResponse {
  location: { lat: number; lng: number }
  branches: NearbyBranch[]
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
