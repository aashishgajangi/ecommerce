# E-Commerce Platform — Progress Tracker

> Legend: `[ ]` pending  `[~]` in progress  `[x]` done
> Companion: PROJECT.md (full reference)
> Update this file as tasks complete.

---

## Phase 0 — Infrastructure Setup

### Git & GitHub
- [x] Create GitHub repository (`ecommerce` — monorepo)
- [~] Init git in `/var/www/Ecommerce`, add remote, push initial commit (PROJECT.md + PROGRESS.md) — waiting for SSH key on GitHub
- [x] Create `.gitignore` (backend: vendor/, .env, storage/logs/; frontend: node_modules/, .next/, .env.local)
- [x] Set default branch to `main`
- [x] Generate dedicated deploy SSH keypair (`ssh-keygen -t ed25519 -C "github-deploy"`)
- [ ] Add SSH public key to GitHub account (Settings → SSH keys)
- [ ] Add GitHub Secrets: `SSH_PRIVATE_KEY`, `SERVER_IP`, `SERVER_USER`, `SERVER_PORT`
- [x] Create `.github/workflows/backend.yml` — PHP test + SSH deploy job
- [x] Create `.github/workflows/frontend.yml` — Node type-check + build + SSH deploy job
- [ ] Verify CI triggers correctly on push to `main`

### Server
- [x] Update Debian, install essentials (curl, git, unzip, ufw)
- [ ] Configure UFW firewall (allow ports 22, 80, 443 only)
- [ ] Install Nginx and verify it serves a default page

### PHP & Laravel Runtime
- [x] Install PHP 8.4 + extensions (fpm, pgsql, redis, mbstring, xml, curl, zip, gd, intl, bcmath)
- [x] Install Composer

### Database
- [x] Install PostgreSQL 17
- [x] Create application database and user with correct privileges
- [x] Verify connection from command line

### Cache & Queue
- [x] Install Redis 8 (7+ compatible)
- [ ] Configure maxmemory and eviction policy (`allkeys-lru`)
- [x] Verify Redis is running and accessible

### Node.js & Frontend Runtime
- [x] Install Node.js 24 (LTS-compatible, installed on server)
- [ ] Install PM2 globally

### File Storage
- [ ] Install MinIO
- [ ] Configure data directory, access key, secret key
- [ ] Create `products` bucket
- [ ] Set bucket policy to public-read for product images
- [ ] Verify pre-signed URL generation works

### Nginx Configuration
- [x] Configure `api.hangoutcakes.com` → PHP-FPM (Laravel — REST API, `/api/v1/*`)
- [x] Configure `admin.hangoutcakes.com` → PHP-FPM (Laravel — Filament panel, `/admin/*`)
- [x] Configure `order.hangoutcakes.com` → PM2 / Node (Next.js on port 4000)
- [ ] Configure `minio.hangoutcakes.com` → MinIO (once installed)
- [x] Cloudflare real-IP snippet applied to all vhosts

### SSL
- [x] Cloudflare proxied — SSL handled by Cloudflare (Flexible mode)
- [x] Cloudflare Origin Certificate saved to `/etc/ssl/cloudflare/`
- [ ] Upgrade to Full (Strict) — uncomment SSL blocks in Nginx vhosts when ready
- [x] `order.hangoutcakes.com` live — returns 200 on port 4000

---

## Phase 1 — Foundation + Catalog

### Backend — Project Init
- [x] Create Laravel 13 project in `/var/www/Ecommerce/backend/`
- [x] Configure `.env` (DB=pgsql, Redis, MinIO/S3, SMTP, Google OAuth placeholders)
- [x] Create `.env.testing` for CI (pgsql test DB, array cache/session/mail)
- [x] Install Laravel Sanctum 4 and publish config
- [x] Install Laravel Socialite 5
- [x] Install Filament 4 and run `filament:install --panels`
- [x] Run initial migrations (users, cache, jobs, personal_access_tokens)
- [x] Configure MinIO as default filesystem (`s3` disk)
- [x] Set up base API route structure (`/api/v1/`) — 49 routes registered
- [x] Create Enums: `UserRole`, `OrderStatus`, `PaymentStatus`, `CouponType`, `RefundStatus`, `ShipmentStatus`

### Backend — Migrations (all 35 tables)
- [x] `users` (with `google_id`, `avatar_url`, `phone`, `role`, `is_active`), `password_reset_tokens`
- [x] `user_addresses`
- [x] `wholesale_profiles`
- [x] `categories` (self-referencing parent_id)
- [x] `brands`
- [x] `attributes`, `attribute_values`
- [x] `products`, `product_categories` (pivot)
- [x] `product_attributes`, `product_variants`, `variant_attribute_values`
- [x] `product_images`
- [x] `inventory`, `inventory_movements`
- [x] `carts`, `cart_items`
- [x] `orders`, `order_items`, `order_status_history`
- [x] `payments` (with currency field, default INR)
- [x] `refunds` **[NEW]**
- [x] `tax_rates` (with HSN code support) **[NEW]**
- [x] `shipping_zones`, `shipping_rates`, `shipments`
- [x] `coupons`, `coupon_conditions`, `coupon_usages`
- [x] `reviews`, `wishlists`
- [x] `pages`, `banners`, `settings`, `notifications`
- [x] Run all 35 migrations: `php artisan migrate` ✅

### Backend — Auth Module
- [x] `AuthController` — register, login, logout, forgot-password, reset-password, me
- [x] `FormRequest` validation (RegisterRequest, LoginRequest)
- [x] Sanctum token returned on login/register
- [ ] Email verification flow (SMTP) — needs SMTP credentials
- [x] `SocialAuthController` — `GET /auth/google` redirect + `GET /auth/google/callback` handler
- [x] Google OAuth upsert logic: find by email (link) → create new user
- [ ] Add authorized redirect URI in Google Cloud Console: `https://api.hangoutcakes.com/api/v1/auth/google/callback`
- [ ] Verify SMTP config — fill `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`
- [ ] Test email delivery (password reset flow)

### Backend — Catalog Module
- [x] `Category` model + `CategoryController` (tree endpoint with children)
- [x] `Brand` model + `BrandController`
- [x] `Attribute`, `AttributeValue` models
- [x] `Product` model with relationships (brand, categories, variants, images, attributes, taxRate)
- [x] `ProductVariant` model with `VariantAttributeValues`
- [x] `ProductImage` model (with MinIO URL accessor)
- [x] `ProductController` — list (filter/sort/search/featured), show (composite with wholesale price)
- [x] Eager loading on all product queries (no N+1)
- [ ] Database indexes: slug (unique), sku (unique), category+active+sort composite, full-text on name+description
- [ ] `SearchController` — full-text search via Laravel Scout + PostgreSQL

### Backend — Filament Admin (Catalog)
- [x] `CategoryResource` — nested category CRUD, parent selector
- [x] `BrandResource` — with logo upload
- [ ] `AttributeResource` + `AttributeValueResource`
- [x] `ProductResource` — tabbed form, variant management, image upload to MinIO, SEO
- [ ] `TaxRateResource` — manage GST slabs, HSN codes **[NEW]**
- [x] `UserResource` — CRUD with role management, active toggle
- [x] `OrderResource` — read-only financials, status update
- [x] `ReviewResource` — moderation (approve/reject)

### Backend — Composite Endpoints
- [x] `GET /api/v1/home` — featured, banners, new arrivals, categories
- [x] `GET /api/v1/products/{slug}` — product + variants + images + attrs + reviews (conditional wholesale_price)
- [ ] Redis caching on home (60s TTL) and category tree (5min TTL)

### Backend — File Upload
- [x] `GET /api/v1/uploads/presign` — returns MinIO pre-signed URL (15-min expiry)
- [ ] Queued job to generate image variants (thumbnail/medium/large) after upload

### Backend — Seeders
- [ ] `TaxRateSeeder` — seed default GST slabs (5%, 12%, 18%, 28%) **[NEW]**
- [ ] `CategorySeeder`
- [ ] `BrandSeeder`
- [ ] `ProductSeeder` (with variants, images, inventory)
- [ ] Run seeders: `php artisan db:seed`

### Frontend — Project Init
- [ ] Create Next.js 15 project in `/var/www/Ecommerce/frontend/`
- [ ] Enable TypeScript strict mode
- [ ] Install and configure Tailwind CSS
- [ ] Set up folder structure (app, components, lib, stores)
- [ ] Install TanStack Query (React Query) + Zustand
- [ ] Create API client in `lib/api/`
- [ ] Create TypeScript interfaces in `lib/types/`
- [ ] Auth pages: login, register, forgot-password

### Frontend — Catalog UI
- [ ] Homepage layout (header, footer, hero)
- [ ] Mega menu with category navigation
- [ ] Category listing page with filters + sort + pagination
- [ ] Product card component with image, price, add-to-cart
- [ ] Product detail page — variant selector, image gallery, attributes, reviews summary
- [ ] Search results page
- [ ] Skeleton loaders for all listing/detail pages
- [ ] Next.js Image component for all product images

### Frontend — SSG / ISR
- [ ] Static generation for category pages
- [ ] Static generation for product pages
- [ ] ISR revalidation every 60s

---

## Phase 2 — Cart + Orders + Payments

### Backend — Cart Module
- [x] `Cart` + `CartItem` models (with subtotal computed attribute)
- [x] `CartController` — stub routes registered (get, add, update, remove, coupon apply/remove)
- [ ] `CartService` — guest cart (session), user cart (DB), merge on login
- [ ] Cart expiry cleanup job (scheduled)
- [ ] Inventory `reserved_quantity` incremented when item added to cart

### Backend — Shipping Module
- [ ] `ShippingZone` + `ShippingRate` models
- [ ] `ShippingCalculator` service — weight-based + order total based
- [ ] `GET /shipping/rates` endpoint
- [ ] `ShippingZoneResource` in Filament

### Backend — Tax Calculation
- [ ] `TaxCalculator` service — apply tax_rate to subtotal **[NEW]**
- [ ] Tax included in `GET /checkout/summary` response

### Backend — Checkout Module
- [ ] `CheckoutController` — `POST /checkout` (place order)
- [ ] `PlaceOrderRequest` validation
- [ ] Order creation: snapshot prices, deduct inventory, create payment record
- [ ] `GET /checkout/summary` composite endpoint

### Backend — Payments
- [ ] Razorpay SDK install + config (`config/payment.php`)
- [ ] Create Razorpay order on checkout initiation
- [ ] `POST /checkout/razorpay/verify` — HMAC signature verification
- [ ] COD flow — order placed, payment_status = pending
- [ ] Razorpay webhook handler (payment.captured, payment.failed)
- [ ] `Payment` model

### Backend — Refunds
- [ ] `RefundService` — initiate refund via Razorpay API, update refund record **[NEW]**
- [ ] `RefundResource` in Filament — admin can initiate and track refunds **[NEW]**
- [ ] Webhook handler for `refund.processed` event **[NEW]**

### Backend — Order Module
- [ ] `Order`, `OrderItem`, `OrderStatusHistory` models
- [ ] `OrderController` — history, detail, cancel
- [ ] Order status machine — valid transitions enforced
- [ ] `PATCH /admin/orders/{id}/status` — admin status update + history entry
- [ ] Order confirmation email (queued job)
- [ ] Low stock alert email when inventory hits threshold (queued job)
- [ ] `OrderResource` in Filament

### Frontend — Cart UI
- [ ] Cart drawer / sidebar component
- [ ] Cart page
- [ ] Add-to-cart button (with quantity selector)
- [ ] Remove item, update quantity
- [ ] Coupon input field + discount display
- [ ] Cart item count in header (Zustand `cartStore`)

### Frontend — Checkout UI
- [ ] Checkout page — address selection / entry
- [ ] Shipping method selector
- [ ] Order summary panel with tax breakdown **[NEW]**
- [ ] Razorpay checkout integration (Razorpay.js)
- [ ] COD option
- [ ] Payment status / confirmation page

### Frontend — Orders UI
- [ ] Order history page (paginated)
- [ ] Order detail page — items, status timeline, tracking
- [ ] Order cancellation flow
- [ ] Customer dashboard (`GET /customer/dashboard` composite)

---

## Phase 3 — Engagement Features

### Backend — Coupons
- [ ] `Coupon`, `CouponCondition`, `CouponUsage` models
- [ ] `CouponValidator` service — type, min order, user limit, date, conditions
- [ ] `POST /cart/coupon` and `DELETE /cart/coupon`
- [ ] Coupon usage recorded on order placed
- [ ] `CouponResource` in Filament

### Backend — Reviews
- [ ] `Review` model
- [ ] `POST /reviews` — verified purchase check (order_item_id exists + delivered)
- [ ] `GET /products/{id}/reviews` — paginated
- [ ] Admin moderation (is_approved), admin reply
- [ ] Rating aggregation (avg rating, count) — cached
- [ ] `ReviewResource` in Filament

### Backend — Wishlist
- [ ] `Wishlist` model
- [ ] `GET/POST/DELETE /wishlist` endpoints
- [ ] Stock notification when wishlisted item restocked (queued notification)

### Backend — B2B Wholesale
- [ ] `WholesaleProfile` model
- [ ] `POST /auth/register/wholesale` — creates profile, pending approval
- [ ] `PATCH /admin/wholesale/{id}/approve` — admin approves, sets role to wholesale
- [ ] Wholesale pricing in `GET /storefront/product/{slug}` (role-gated)
- [ ] Min wholesale qty enforcement at checkout
- [ ] `WholesaleProfileResource` in Filament (approve/reject workflow)

### Frontend — Coupons UI
- [ ] Coupon code input in cart
- [ ] Discount line in checkout summary
- [ ] Error message for invalid/expired coupons

### Frontend — Reviews UI
- [ ] Review list on product detail page (star ratings, pagination)
- [ ] Submit review form (only for verified purchases)
- [ ] Star rating component

### Frontend — Wishlist UI
- [ ] Wishlist page
- [ ] Add-to-wishlist button on product cards and detail page
- [ ] Remove from wishlist
- [ ] Wishlist count in header

### Frontend — B2B UI
- [ ] B2B registration form (company name, GSTIN, trade license upload)
- [ ] "Pending approval" state after registration
- [ ] Wholesale price display (shown only to approved wholesale users)
- [ ] Bulk order quantity input (min qty enforced)

---

## Phase 4 — Polish + Launch

### Backend — CMS
- [ ] `Page`, `Banner`, `Setting` models
- [ ] `PageResource`, `BannerResource`, `SettingResource` in Filament
- [ ] `GET /pages/{slug}` endpoint for static pages

### Backend — SEO
- [ ] Dynamic sitemap: `GET /sitemap.xml` (products, categories, pages)
- [ ] `GET /robots.txt`
- [ ] JSON-LD structured data per product (`GET /seo/product/{slug}`)
- [ ] Meta tags API fields on product + category responses

### Backend — Admin Dashboard & Reports
- [ ] `GET /admin/dashboard` — sales stats, order counts, revenue, low-stock alerts
- [ ] `GET /admin/reports/sales` — date range filter
- [ ] `GET /admin/reports/tax` — GST collected by rate **[NEW]**
- [ ] `POST /admin/inventory/bulk` — CSV stock update

### Backend — Notifications
- [ ] Order placed — email + DB notification
- [ ] Order status change — email + DB notification
- [ ] Payment received — DB notification
- [ ] Shipment created — email + DB notification with tracking number
- [ ] Low stock alert — admin email
- [ ] Wishlist item back in stock — user email

### Backend — Performance & Security
- [ ] Load test API endpoints (Apache Bench or k6)
- [ ] Query profiling — identify slow queries, add missing indexes
- [ ] Redis cache hit ratio review — tune TTLs
- [ ] Rate limiting verified on all public endpoints
- [ ] Security audit — OWASP top 10 checklist
- [ ] `PATCH /admin/orders/{id}/status` — restrict status transitions

### Frontend — CMS & Static Pages
- [ ] Homepage carousel (banners from API)
- [ ] Static page renderer (`/pages/[slug]`)
- [ ] Footer links pulled from CMS pages

### Frontend — SEO
- [ ] Meta tags + Open Graph on all pages (product, category, home)
- [ ] Structured data (JSON-LD) on product pages
- [ ] Dynamic sitemap linked from robots.txt

### Frontend — Performance
- [ ] Lighthouse audit — target 90+ score on all pages
- [ ] Core Web Vitals pass (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] Bundle size analysis (`next build` output)
- [ ] Code splitting verified — no oversized bundles

### Frontend — Polish
- [ ] 404 page
- [ ] 500 / error boundary page
- [ ] Empty states (empty cart, empty wishlist, no results)
- [ ] Form accessibility audit (labels, focus states, keyboard nav)
- [ ] Mobile responsiveness audit across all pages

### Deployment — Production
- [ ] Production `.env` files configured (both backend + frontend)
- [ ] `php artisan config:cache && php artisan route:cache && php artisan view:cache`
- [ ] `next build` — production frontend build
- [ ] PM2 start frontend with ecosystem config
- [ ] Laravel queue worker running via systemd
- [ ] Laravel scheduler registered in cron
- [ ] PostgreSQL daily backup job configured
- [ ] MinIO data directory backed up or replicated
- [ ] All Nginx vhosts returning 200 with valid SSL
- [ ] Smoke test: register → browse → add to cart → checkout → order confirmation

---

## Discovered During Development

> Add tasks here as new requirements emerge during implementation.
> Format: `- [ ] Description (discovered: Phase X, reason)`

