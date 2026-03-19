# E-Commerce Platform — Project Reference

> Single source of truth. Update this document when architecture decisions change.
> Companion: PROGRESS.md (task tracker)

---

## 1. Project Summary

Single-vendor e-commerce store selling physical products to both B2C retail customers and B2B wholesale buyers.
Self-hosted, open source, zero subscriptions. Target: 10,000–100,000 users in first 6 months.

**Payment gateway:** Razorpay + Cash on Delivery (COD)
**Market:** India (GST tax system, INR currency)
**Approach:** API-first — every consumer (web, admin, mobile) uses the same Laravel REST API

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| OS | Debian | 13 |
| Reverse Proxy | Nginx | latest stable |
| Backend | Laravel (pure REST API, no Livewire) | 13 |
| Language | PHP | 8.4 |
| Admin Panel | Filament (built into Laravel) | 4 |
| Frontend | Next.js + TypeScript (strict mode) | 15 |
| Database | PostgreSQL | 17 |
| Cache / Queue | Redis | 7 |
| Runtime | Node.js LTS | 22 |
| File Storage | MinIO (self-hosted S3-compatible) | latest |
| Search | Laravel Scout + PostgreSQL (Meilisearch later) | — |
| Process Manager | PM2 (for Next.js) | latest |
| SSL | Let's Encrypt via Certbot | — |
| Auth | Laravel Sanctum (token-based) | — |
| OAuth | Laravel Socialite (Google) | — |
| Email | SMTP via Laravel Mailer (any SMTP provider) | — |

---

## 3. System Architecture

```
Browser (B2C Customer) ──→ Next.js Frontend ──→ Laravel API
                                                      │
Admin (You/Team) ──→ Filament Panel ──→ Laravel Core  │
                                                      │
Future: Mobile App ──→ Same Laravel API ──────────────┘
                                                      │
                            ┌─────────────────────────┤
                            ▼           ▼              ▼
                       PostgreSQL     Redis          MinIO
                       (data)      (cache/queue)   (files)
```

Key principle: Every consumer talks to the same `/api/v1/*` endpoints.
No business logic lives in the frontend. Mobile apps later require zero backend changes.

**Domains:**
- `yourdomain.com` → PM2 / Next.js (storefront)
- `api.yourdomain.com` → PHP-FPM / Laravel (REST API — `/api/v1/*`)
- `admin.yourdomain.com` → PHP-FPM / Laravel (Filament panel — `/admin/*`)
- `minio.yourdomain.com` → MinIO console (internal/optional)

> `api.` and `admin.` are both served by the **same Laravel app** and same PHP-FPM pool.
> Nginx has two separate server blocks routing to the same `backend/public/` directory.

---

## 4. Database Schema (32 Tables)

> Tables marked `[NEW]` were added beyond the original blueprint.

### 4.1 Users & Authentication

**users**
```
id, name, email, phone, password (nullable — null for OAuth-only users),
role (enum: customer/wholesale/admin),
google_id (nullable, unique — set when user signs in via Google),
avatar_url (nullable — pulled from Google profile on first OAuth login),
email_verified_at, is_active, created_at, updated_at
```

**user_addresses**
```
id, user_id, label, address_line_1, address_line_2,
city, state, postal_code, country,
is_default, type (enum: shipping/billing)
```

**wholesale_profiles**
```
id, user_id, company_name, gstin, trade_license,
credit_limit, payment_terms_days,
is_approved, approved_at, approved_by
```

**password_reset_tokens**
```
email, token, created_at
```

### 4.2 Product Catalog

**categories**
```
id, parent_id (self-ref, unlimited nesting), name, slug,
description, image_path, sort_order, is_active, depth
```

**brands**
```
id, name, slug, logo_path, is_active
```

**attributes**
```
id, name, slug, type (enum: text/number/color/select),
is_filterable, is_variant
```

**attribute_values**
```
id, attribute_id, value, color_code (nullable), sort_order
```

**products**
```
id, brand_id, name, slug, description, short_description,
base_price, wholesale_price, min_wholesale_qty,
sku_prefix, weight, is_active, is_featured,
meta_title, meta_description, created_at, updated_at
```

**product_categories** (pivot)
```
product_id, category_id
```

**product_attributes** (non-variant attrs: material, weight, etc.)
```
product_id, attribute_id, attribute_value_id
```

**product_variants** (each size+color combination = 1 row)
```
id, product_id, sku, price, wholesale_price, weight, is_active
```

**variant_attribute_values** (links variant to its attribute values)
```
variant_id, attribute_id, attribute_value_id
```

**product_images**
```
id, product_id, variant_id (nullable), path, alt_text,
sort_order, is_primary
```

### 4.3 Inventory

**inventory**
```
id, variant_id, quantity, reserved_quantity, low_stock_threshold
```

**inventory_movements** (full audit trail)
```
id, variant_id, quantity_change,
type (enum: purchase/sale/adjustment/return),
reference_type, reference_id, note, created_at
```

### 4.4 Cart

**carts**
```
id, user_id (nullable — guests), session_id, expires_at
```

**cart_items**
```
id, cart_id, variant_id, quantity, unit_price
```

### 4.5 Orders & Payments

**orders**
```
id, user_id, order_number,
status (enum: pending/confirmed/processing/shipped/delivered/cancelled/refunded),
subtotal, discount_amount, tax_amount, shipping_amount, total,
payment_method, payment_status,
shipping_address_json, billing_address_json,
notes, placed_at
```

**order_items** (price snapshot at purchase time)
```
id, order_id, variant_id,
product_name, variant_name, sku,
quantity, unit_price, total_price
```

**payments**
```
id, order_id, gateway, gateway_transaction_id,
amount, currency (default: INR), status,
gateway_response_json, paid_at
```

**order_status_history**
```
id, order_id, from_status, to_status,
note, changed_by, created_at
```

**refunds** `[NEW]`
```
id, payment_id, order_id,
amount, currency (default: INR),
reason, gateway_refund_id (nullable),
status (enum: pending/processed/failed),
initiated_by (user_id), created_at
```

### 4.6 Tax `[NEW]`

**tax_rates** `[NEW]`
```
id, name (e.g. "GST 18%"), rate (decimal 4,2),
hsn_code (nullable), is_default, is_active, created_at
```

> Note: Product categories will reference a tax_rate_id once per-category tax is implemented.
> Tax calculation at checkout: `tax_amount = subtotal × (tax_rate.rate / 100)`

### 4.7 Shipping

**shipping_zones**
```
id, name, countries (jsonb), states (jsonb)
```

**shipping_rates**
```
id, zone_id, method_name,
min_weight, max_weight,
min_order_total, price, is_free_above
```

**shipments**
```
id, order_id, tracking_number, carrier,
status, shipped_at, delivered_at
```

### 4.8 Coupons & Discounts

**coupons**
```
id, code, type (enum: percentage/fixed/free_shipping),
value, min_order_amount, max_discount_amount,
usage_limit, used_count, per_user_limit,
valid_from, valid_until, is_active
```

> Note: `applies_to` enum removed — all targeting is driven through `coupon_conditions` only.

**coupon_conditions**
```
id, coupon_id, condition_type, condition_ids (jsonb)
```

**coupon_usages**
```
id, coupon_id, user_id, order_id, used_at
```

### 4.9 Reviews & Wishlist

**reviews**
```
id, user_id, product_id, order_item_id,
rating (1–5), title, body,
is_verified_purchase, is_approved,
admin_reply, replied_at
```

**wishlists**
```
id, user_id, product_id, variant_id (nullable), added_at
```

### 4.10 CMS & Settings

**pages**
```
id, title, slug, body,
meta_title, meta_description, is_published
```

**banners**
```
id, title, image_path, link_url,
position, sort_order, is_active, starts_at, ends_at
```

**settings**
```
id, group, key, value (jsonb)
```

**notifications**
```
id, user_id, type, title, body,
data (jsonb), read_at, created_at
```

---

## 5. API Structure

All endpoints prefixed with `/api/v1`. Auth via Laravel Sanctum tokens.

### 5.1 Composite Endpoints (reduce round-trips)

```
GET  /storefront/home               → featured products, banners, new arrivals,
                                      popular categories, active promotions
GET  /storefront/product/{slug}     → product + variants + images + attributes
                                      + reviews summary + related products
                                      (wholesale_price returned if user role = wholesale)
GET  /customer/dashboard            → recent orders, wishlist count, review count,
                                      address count, notifications
GET  /checkout/summary              → cart items, applied coupons, shipping options,
                                      tax calculation, total breakdown
```

### 5.2 Authentication

```
POST  /auth/register              → B2C customer registration
POST  /auth/register/wholesale    → B2B registration (requires admin approval)
POST  /auth/login                 → Returns Sanctum token
POST  /auth/logout                → Invalidate token
POST  /auth/forgot-password       → Send reset email
POST  /auth/reset-password        → Reset with token
GET   /auth/me                    → Current user profile

GET   /auth/google                → Redirect to Google OAuth consent screen
GET   /auth/google/callback       → Handle Google callback → upsert user → return Sanctum token
```

**Google OAuth flow:**
1. Frontend calls `GET /auth/google` — Laravel redirects to Google
2. User grants permission — Google redirects to `/auth/google/callback`
3. Laravel Socialite reads profile, finds or creates user by `google_id` / email
4. If email already exists (registered manually) — links `google_id` to existing account
5. Returns Sanctum token — same token format as password login
6. Frontend stores token, user is logged in

**SMTP — emails sent by the system:**
- Email verification on registration
- Password reset link
- Order confirmation
- Order status updates
- Shipment tracking notification
- Low stock alert (admin)
- Wholesale approval notification

### 5.3 Catalog (Public)

```
GET  /categories                  → Category tree (nested)
GET  /categories/{slug}/products  → Products in category with filters
GET  /products                    → Search + filter (price, brand, attributes, sort)
GET  /products/{slug}             → Full product detail (composite)
GET  /products/{id}/reviews       → Paginated reviews
GET  /brands                      → All active brands
GET  /search?q=                   → Full-text product search
```

### 5.4 File Uploads

```
POST  /uploads/presign            → Request MinIO pre-signed URL for direct browser upload
                                    Body: { filename, content_type, folder }
                                    Returns: { upload_url, public_url }
```

### 5.5 Cart & Checkout

```
GET    /cart                        → Current cart with items
POST   /cart/items                  → Add item (variant_id + quantity)
PATCH  /cart/items/{id}             → Update quantity
DELETE /cart/items/{id}             → Remove item
POST   /cart/coupon                 → Apply coupon code
DELETE /cart/coupon                 → Remove coupon
GET    /shipping/rates              → Calculate shipping for cart
POST   /checkout                    → Place order (address + payment method)
POST   /checkout/razorpay/verify    → Verify Razorpay payment signature
```

### 5.6 Customer (Authenticated)

```
GET    /orders                      → Order history (paginated)
GET    /orders/{number}             → Order detail with items + status history
POST   /orders/{id}/cancel          → Request cancellation
GET    /wishlist                    → User's wishlist
POST   /wishlist                    → Add to wishlist
DELETE /wishlist/{id}               → Remove from wishlist
POST   /reviews                     → Submit review (verified purchase check)
GET    /addresses                   → List addresses
POST   /addresses                   → Add address
PATCH  /addresses/{id}              → Update address
DELETE /addresses/{id}              → Delete address
PATCH  /profile                     → Update profile
```

### 5.7 Admin (Filament handles CRUD, these are extras)

```
GET    /admin/dashboard             → Sales stats, order counts, revenue, low stock alerts
PATCH  /admin/orders/{id}/status    → Update order status + trigger notifications
POST   /admin/inventory/bulk        → CSV-based stock update
PATCH  /admin/wholesale/{id}/approve → Approve B2B customer
GET    /admin/reports/sales         → Sales reports with date range filters
GET    /admin/reports/tax           → GST reports (rate breakdown, total collected)
```

### 5.8 SEO (Phase 4)

```
GET  /sitemap.xml                   → Dynamic sitemap (products, categories, pages)
GET  /robots.txt                    → Robots config
GET  /seo/product/{slug}            → JSON-LD structured data for product
```

---

## 6. Module Breakdown

| Module | Models | Key Features |
|---|---|---|
| Auth & Users | User, UserAddress, WholesaleProfile | Registration, login, roles, B2B approval |
| Catalog | Category, Brand, Attribute, AttributeValue, Product, ProductVariant, ProductImage | Deep categories, variant matrix, filterable attributes, SEO slugs |
| Inventory | Inventory, InventoryMovement | Stock per variant, low-stock alerts, full audit trail |
| Cart | Cart, CartItem | Guest + user carts, session merge on login, expiry cleanup |
| Orders | Order, OrderItem, OrderStatusHistory | Order lifecycle, status machine, cancellation |
| Payments | Payment, Refund | Razorpay + COD, webhook verification, refund tracking |
| Tax | TaxRate | GST slabs, HSN codes, Filament-configurable |
| Shipping | ShippingZone, ShippingRate, Shipment | Zone-based rates, weight calc, tracking |
| Coupons | Coupon, CouponCondition, CouponUsage | Percentage/fixed/free-shipping, per-user limits |
| Reviews | Review | Verified purchase, moderation, admin reply |
| Wishlist | Wishlist | Add/remove, stock notifications |
| CMS | Page, Banner, Setting | Static pages, banners, store config |
| Notifications | Notification | Order updates, stock alerts, email + DB |

---

## 7. Performance Strategy

### Backend (Laravel)
- **Composite endpoints** — home, product detail, dashboard, checkout return everything in 1 request
- **Redis caching** — homepage (60s TTL), category tree (5min), product counts, settings
- **Eager loading** — `Product::with(['variants','images','brand','categories'])` everywhere — no N+1
- **Database indexes** — composite on `(category_id, is_active, sort_order)`, unique on `slug`, `sku`; full-text on product name + description
- **Queue heavy work** — emails, image processing, inventory sync, reports — all async via Redis queues
- **Pagination** — default 20 items, max 100 — no unbounded lists ever

### Frontend (Next.js)
- **TanStack Query (React Query)** — client-side cache, stale-while-revalidate, deduplication
- **SSG** — category pages, product pages pre-rendered at build
- **ISR** — revalidate every 60s without full rebuild
- **Parallel fetching** — `Promise.all()` for multi-fetch scenarios
- **Skeleton loaders** — show UI structure immediately
- **Next.js Image** — lazy loading, WebP, responsive srcset
- **Code splitting** — each page loads only its bundle

### Database (PostgreSQL)
- JSONB for flexible data (settings, gateway responses, address snapshots)
- Materialized views for expensive aggregations (sales stats, product ratings)
- Partial indexes — `WHERE is_active = true`
- PgBouncer connection pooling at scale

### MinIO
- Pre-signed URLs — files upload direct from browser, never pass through Laravel
- Image variants (thumbnail/medium/large) generated via queued jobs after upload
- CDN-friendly public URLs for product images

---

## 8. Security

| Area | Implementation |
|---|---|
| Auth | Laravel Sanctum — token-based, CSRF for SPA, scoped tokens |
| Rate limiting | 60 req/min guests, 120 authenticated, 10/min login attempts |
| Input validation | FormRequest on every endpoint — whitelist fields, reject everything else |
| SQL injection | Eloquent parameterizes all queries |
| XSS | Laravel auto-escapes, Next.js escapes JSX, CSP headers via Nginx |
| CORS | Strict origin whitelist — only your domain calls the API |
| Payments | Razorpay HMAC signature verification on every webhook callback |
| Passwords | Bcrypt cost factor 12 |
| HTTPS | Nginx + Let's Encrypt, auto-renewal |
| File uploads | Whitelist extensions (jpg/png/webp), max size limits, stored in MinIO (not web root) |
| B2B | Wholesale accounts require manual admin approval before accessing wholesale pricing |
| Google OAuth | Socialite state param verified, CSRF protected, token linked to user by google_id |
| Secrets | All keys in `.env`, never committed to git |

---

## 9. Folder Structure

### Laravel Backend (`/var/www/Ecommerce/backend/`)

```
app/
├── Models/                          → User, Product, Order, TaxRate, Refund, etc.
├── Http/
│   ├── Controllers/Api/V1/
│   │   ├── Auth/                    → AuthController, SocialAuthController (Google OAuth)
│   │   ├── Storefront/              → HomeController, ProductDetailController
│   │   ├── Catalog/                 → CategoryController, ProductController, BrandController
│   │   ├── Cart/                    → CartController
│   │   ├── Checkout/                → CheckoutController, RazorpayController
│   │   ├── Customer/                → OrderController, WishlistController, AddressController
│   │   ├── Upload/                  → PresignController
│   │   └── Admin/                   → DashboardController, ReportController
│   ├── Requests/                    → StoreProductRequest, PlaceOrderRequest, etc.
│   └── Resources/                   → ProductResource, OrderResource, etc.
├── Services/                        → CartService, PaymentService, ShippingCalculator,
│                                      CouponValidator, TaxCalculator, RefundService
├── Filament/Resources/              → ProductResource, OrderResource, TaxRateResource,
│                                      RefundResource (admin panel CRUD)
├── Jobs/                            → SendOrderEmail, ProcessImage, SyncInventory
├── Events/                          → OrderPlaced, PaymentReceived, StockLow
├── Listeners/                       → SendOrderConfirmation, DeductInventory
├── Enums/                           → OrderStatus, PaymentStatus, UserRole,
│                                      CouponType, RefundStatus
config/
├── filesystems.php                  → MinIO (S3) configuration
├── payment.php                      → Razorpay keys
├── shipping.php                     → Shipping defaults
database/
├── migrations/                      → Timestamped schema files
├── seeders/                         → CategorySeeder, ProductSeeder, TaxRateSeeder
routes/
├── api.php                          → All API routes
tests/
├── Feature/                         → API endpoint tests
├── Unit/                            → Service / model unit tests
```

### Next.js Frontend (`/var/www/Ecommerce/frontend/`)

```
app/
├── (store)/
│   ├── page.tsx                     → Homepage
│   ├── categories/[slug]/page.tsx   → Category listing
│   ├── products/[slug]/page.tsx     → Product detail
│   ├── search/page.tsx              → Search results
│   ├── cart/page.tsx                → Cart
│   └── checkout/page.tsx            → Checkout flow
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (customer)/
│   ├── dashboard/page.tsx
│   ├── orders/page.tsx
│   ├── orders/[number]/page.tsx
│   ├── wishlist/page.tsx
│   ├── addresses/page.tsx
│   └── profile/page.tsx
components/
├── ui/                              → Button, Input, Modal, Skeleton, Badge
├── product/                         → ProductCard, VariantSelector, ImageGallery, ReviewList
├── cart/                            → CartDrawer, CartItem, CouponInput
├── layout/                          → Header, Footer, MegaMenu, Breadcrumbs, SearchBar
lib/
├── api/                             → API client functions (getProducts, placeOrder, etc.)
├── hooks/                           → useCart, useAuth, useWishlist
├── types/                           → Product, Order, User TypeScript interfaces
├── utils/                           → formatPrice, formatDate, slugify
stores/                              → Zustand (cartStore, authStore)
```

---

## 10. Deployment Sequence

```
1.  Update Debian, install essentials (curl, git, unzip, ufw)
2.  Install Nginx, configure firewall (ports 80, 443, 22 only)
3.  Install PHP 8.4 + extensions (fpm, pgsql, redis, mbstring, xml, curl, zip, gd, intl)
4.  Install PostgreSQL 17 — create database + user
5.  Install Redis 7 — configure maxmemory + eviction policy
6.  Install Node.js 22 LTS via nvm
7.  Install Composer (PHP package manager)
8.  Install and configure MinIO (data dir, access keys, bucket creation)
9.  Configure Nginx:
      api.yourdomain.com   → PHP-FPM (Laravel — REST API only, /api/v1/*)
      admin.yourdomain.com → PHP-FPM (Laravel — Filament panel only, /admin/*)
      yourdomain.com       → PM2 / Node (Next.js storefront)
      minio.yourdomain.com → MinIO console (internal)
      Note: api.* and admin.* both point to the same Laravel app / PHP-FPM pool
10. SSL via Certbot (Let's Encrypt) for all domains
11. Clone repos, install dependencies, run migrations + seeders, build frontend
12. PM2 config for Next.js process management
13. PHP-FPM pool config (pm.max_children based on RAM)
14. Laravel queue worker via systemd service
15. Laravel scheduler via cron (`* * * * * php artisan schedule:run`)
16. Automated daily PostgreSQL backups (pg_dump → MinIO or offsite)
17. MinIO bucket policies (public-read for product images)
18. Configure SMTP in `.env` (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS)
19. Configure Google OAuth in `.env` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
    → Add `api.yourdomain.com/api/v1/auth/google/callback` as an authorized redirect URI in Google Cloud Console
```

### Minimum VPS Specs

| Stage | RAM | CPU | Storage | Bandwidth |
|---|---|---|---|---|
| Launch (< 10K users) | 4 GB | 2 vCPU | 40 GB SSD | 2 TB/mo |
| Scale (10K–100K users) | 8 GB | 4 vCPU | 80 GB NVMe | 4 TB/mo |

---

## 11. Known Gaps & Decisions

| # | Gap | Decision |
|---|---|---|
| 1 | Tax configuration | Added `tax_rates` table. HSN code support included. Configurable per product category in Filament. |
| 2 | Refund tracking | Added separate `refunds` table linked to `payments`. Admin-visible in Filament. |
| 3 | `payments.currency` | Added `currency` field (default INR) for Razorpay compatibility and future multi-currency. |
| 4 | Coupon redundancy | Removed `coupons.applies_to` enum. All targeting driven exclusively through `coupon_conditions` table. |
| 5 | MinIO presign endpoint | Added `POST /uploads/presign` to API. |
| 6 | B2B composite pricing | `GET /storefront/product/{slug}` conditionally returns `wholesale_price` when authenticated user role = wholesale. |
| 7 | `wholesale_profiles.credit_limit` | Kept for now. Outstanding balance tracking is future scope — mark as v2. |
| 8 | Sitemap / robots | Added to API structure under Section 5.8. Implemented in Phase 4. |

---

## 12. Git & CI/CD

### Repository Structure

**Single monorepo on GitHub:**
```
github.com/you/ecommerce          ← one repo
├── backend/                      ← Laravel 12
├── frontend/                     ← Next.js 15
├── .github/
│   └── workflows/
│       ├── backend.yml           ← Laravel CI + deploy
│       └── frontend.yml          ← Next.js CI + deploy
├── .gitignore
├── PROJECT.md
└── PROGRESS.md
```

### Branch Strategy

| Branch | Purpose | Auto-deploy |
|---|---|---|
| `main` | Production — always deployable | Yes → production server |
| `feature/*` | New features — open PR to merge into main | No |
| `fix/*` | Bug fixes — open PR to merge into main | No |

**Workflow:** create branch → write code → open PR → CI runs tests → merge to `main` → auto-deploys.

### .gitignore

Backend ignores: `vendor/`, `.env`, `storage/logs/`, `storage/framework/cache/`
Frontend ignores: `node_modules/`, `.next/`, `.env.local`

### GitHub Actions — Backend (`backend.yml`)

**Trigger:** push or PR to `main` where files in `backend/**` changed

```
Job 1 — test (runs on every push/PR)
  ├── PHP 8.4
  ├── PostgreSQL 17 service container
  ├── Redis 7 service container
  ├── composer install
  ├── cp .env.testing .env && php artisan key:generate
  ├── php artisan migrate
  ├── vendor/bin/pint --test        ← code style check (Laravel Pint)
  └── php artisan test              ← Pest / PHPUnit

Job 2 — deploy (runs only if test passes AND branch = main)
  ├── SSH into production server
  ├── cd /var/www/Ecommerce && git pull origin main
  ├── cd backend
  ├── composer install --no-dev --optimize-autoloader
  ├── php artisan migrate --force
  ├── php artisan config:cache
  ├── php artisan route:cache
  ├── php artisan view:cache
  ├── sudo systemctl restart php8.4-fpm
  └── sudo systemctl restart laravel-queue
```

### GitHub Actions — Frontend (`frontend.yml`)

**Trigger:** push or PR to `main` where files in `frontend/**` changed

```
Job 1 — test (runs on every push/PR)
  ├── Node.js 22
  ├── npm ci
  ├── npm run type-check     ← tsc --noEmit
  ├── npm run lint           ← ESLint
  └── npm run build          ← next build (catches build errors)

Job 2 — deploy (runs only if test passes AND branch = main)
  ├── SSH into production server
  ├── cd /var/www/Ecommerce && git pull origin main
  ├── cd frontend
  ├── npm ci
  ├── npm run build
  └── pm2 reload ecosystem.config.js --update-env
```

### GitHub Secrets Required

Set these in GitHub → repo Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Private key of the deploy SSH keypair (public key added to server's `~/.ssh/authorized_keys`) |
| `SERVER_IP` | Production server IP address |
| `SERVER_USER` | SSH user on the server (e.g. `deploy` or `root`) |
| `SERVER_PORT` | SSH port (default `22`) |

> Generate a dedicated deploy keypair (`ssh-keygen -t ed25519 -C "github-deploy"`).
> Never reuse your personal SSH key.

---

## 13. Future Roadmap

### Mobile App
- **Recommended:** React Native with Expo
- **Why:** Web frontend is already React + TypeScript — same language, same patterns, share utility code
- **Zero backend changes required** — mobile consumes the same `/api/v1/*` endpoints
- **Auth:** Same Sanctum tokens in `Authorization: Bearer` header
- **Push notifications:** Firebase Cloud Messaging, triggered from existing Laravel notification system
- **Build order:** Android first, then iOS from the same codebase

### Phase 2 Features (Post-launch)
- Meilisearch for advanced search (drop-in via Laravel Scout)
- PgBouncer for connection pooling at high traffic
- CDN in front of MinIO (Cloudflare or BunnyCDN)
- Multi-currency support (currency field already on payments)
- Abandoned cart recovery emails
- Product bundles / kits
- Loyalty points system
- B2B credit terms with outstanding balance tracking
