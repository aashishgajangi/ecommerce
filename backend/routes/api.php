<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\SocialAuthController;
use App\Http\Controllers\Api\V1\Catalog\BrandController;
use App\Http\Controllers\Api\V1\Catalog\CategoryController;
use App\Http\Controllers\Api\V1\Catalog\ProductController;
use App\Http\Controllers\Api\V1\Cart\CartController;
use App\Http\Controllers\Api\V1\Order\OrderController;
use App\Http\Controllers\Api\V1\Order\CheckoutController;
use App\Http\Controllers\Api\V1\Payment\PaymentController;
use App\Http\Controllers\Api\V1\User\ProfileController;
use App\Http\Controllers\Api\V1\User\AddressController;
use App\Http\Controllers\Api\V1\User\WishlistController;
use App\Http\Controllers\Api\V1\User\NotificationController;
use App\Http\Controllers\Api\V1\Review\ReviewController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\Branch\BranchController;
use App\Http\Controllers\Api\V1\Branch\DeliveryController;
use App\Http\Controllers\Api\V1\UploadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('v1.')->group(function () {

    // ── Public: Site settings ───────────────────────────────────────────
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings');

    // ── Public: Home composite ──────────────────────────────────────────
    Route::get('/home', [HomeController::class, 'index'])->name('home');

    // ── Public: Auth ────────────────────────────────────────────────────
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->name('register');
        Route::post('/login', [AuthController::class, 'login'])->name('login');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('forgot-password');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('reset-password');
        Route::post('/email/verify', [AuthController::class, 'verifyEmail'])->name('email.verify');
        Route::post('/email/resend', [AuthController::class, 'resendVerification'])->middleware('auth:sanctum')->name('email.resend');

        // Google OAuth
        Route::get('/google', [SocialAuthController::class, 'redirect'])->name('google');
        Route::get('/google/callback', [SocialAuthController::class, 'callback'])->name('google.callback');
    });

    // ── Public: Branches & Delivery ─────────────────────────────────────
    Route::prefix('branches')->name('branches.')->group(function () {
        Route::get('/', [BranchController::class, 'index'])->name('index');
        Route::get('/nearby', [BranchController::class, 'nearby'])->name('nearby');
        Route::get('/{slug}', [BranchController::class, 'show'])->name('show');
    });
    Route::post('/delivery/options', [DeliveryController::class, 'options'])->name('delivery.options');

    // ── Public: Catalog ─────────────────────────────────────────────────
    Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::get('/categories/{slug}', [CategoryController::class, 'show'])->name('categories.show');

    Route::get('/brands', [BrandController::class, 'index'])->name('brands.index');

    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/{slug}', [ProductController::class, 'show'])->name('products.show');

    // ── Protected: Requires Sanctum token ───────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');

        // Profile
        Route::prefix('profile')->name('profile.')->group(function () {
            Route::get('/', [ProfileController::class, 'show'])->name('show');
            Route::put('/', [ProfileController::class, 'update'])->name('update');
            Route::put('/password', [ProfileController::class, 'changePassword'])->name('password');
            Route::put('/avatar', [ProfileController::class, 'updateAvatar'])->name('avatar');
        });

        // Addresses
        Route::apiResource('addresses', AddressController::class);
        Route::post('/addresses/{address}/default', [AddressController::class, 'setDefault'])->name('addresses.default');

        // Cart
        Route::prefix('cart')->name('cart.')->group(function () {
            Route::get('/', [CartController::class, 'show'])->name('show');
            Route::post('/items', [CartController::class, 'addItem'])->name('items.add');
            Route::put('/items/{cartItem}', [CartController::class, 'updateItem'])->name('items.update');
            Route::delete('/items/{cartItem}', [CartController::class, 'removeItem'])->name('items.remove');
            Route::delete('/', [CartController::class, 'clear'])->name('clear');
            Route::post('/coupon', [CartController::class, 'applyCoupon'])->name('coupon.apply');
            Route::delete('/coupon', [CartController::class, 'removeCoupon'])->name('coupon.remove');
        });

        // Checkout
        Route::prefix('checkout')->name('checkout.')->group(function () {
            Route::get('/', [CheckoutController::class, 'summary'])->name('summary');
            Route::post('/place', [CheckoutController::class, 'place'])->name('place');
            Route::get('/shipping-rates', [CheckoutController::class, 'shippingRates'])->name('shipping-rates');
        });

        // Orders
        Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');

        // Payments
        Route::prefix('payments')->name('payments.')->group(function () {
            Route::post('/initiate', [PaymentController::class, 'initiate'])->name('initiate');
            Route::post('/verify', [PaymentController::class, 'verify'])->name('verify');
            Route::post('/webhook', [PaymentController::class, 'webhook'])->name('webhook')->withoutMiddleware('auth:sanctum');
        });

        // Reviews
        Route::get('/products/{product}/reviews', [ReviewController::class, 'index'])->name('reviews.index')->withoutMiddleware('auth:sanctum');
        Route::post('/products/{product}/reviews', [ReviewController::class, 'store'])->name('reviews.store');

        // Wishlist
        Route::get('/wishlist', [WishlistController::class, 'index'])->name('wishlist.index');
        Route::post('/wishlist/{product}', [WishlistController::class, 'toggle'])->name('wishlist.toggle');

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

        // Coupons (validate)
        Route::post('/coupons/validate', [CouponController::class, 'validate'])->name('coupons.validate');

        // Upload presigned URL
        Route::get('/uploads/presign', [UploadController::class, 'presign'])->name('uploads.presign');
    });
});
