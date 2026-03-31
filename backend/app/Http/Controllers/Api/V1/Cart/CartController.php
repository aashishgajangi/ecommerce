<?php

namespace App\Http\Controllers\Api\V1\Cart;

use App\Http\Controllers\Api\V1\ApiController;
use App\Enums\CouponType;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends ApiController
{
    private function getOrCreateCart(Request $request): Cart
    {
        $user = $request->user();

        $cart = Cart::where('user_id', $user->id)
            ->with(['items.product.primaryImage', 'items.variant', 'coupon'])
            ->first();

        if (! $cart) {
            $cart = Cart::create(['user_id' => $user->id]);
            $cart->load(['items.product.primaryImage', 'items.variant', 'coupon']);
        }

        return $cart;
    }

    private function formatCart(Cart $cart): array
    {
        $cart->load(['items.product.primaryImage', 'items.variant', 'coupon']);

        $subtotal = $cart->items->sum(fn ($i) => (float) $i->unit_price * $i->quantity);
        $discountAmount = 0.0;

        if ($cart->coupon) {
            $coupon = $cart->coupon;
            if ($coupon->type === CouponType::Percentage) {
                $discountAmount = round($subtotal * ($coupon->value / 100), 2);
                if ($coupon->max_discount_amount && $discountAmount > $coupon->max_discount_amount) {
                    $discountAmount = (float) $coupon->max_discount_amount;
                }
            } else {
                $discountAmount = min((float) $coupon->value, $subtotal);
            }
        }

        $taxableAmount = $subtotal - $discountAmount;
        $taxRate = 18.0; // default GST
        $taxAmount = round($taxableAmount * ($taxRate / 100), 2);
        $total = round($taxableAmount + $taxAmount, 2);

        return [
            'id' => $cart->id,
            'items' => $cart->items->map(fn ($item) => [
                'id' => $item->id,
                'product' => [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                    'slug' => $item->product->slug,
                    'primary_image' => $item->product->primaryImage ? [
                        'url' => $item->product->primaryImage->url,
                        'alt_text' => $item->product->primaryImage->alt_text,
                    ] : null,
                ],
                'variant' => $item->variant ? [
                    'id' => $item->variant->id,
                    'sku' => $item->variant->sku,
                ] : null,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => round((float) $item->unit_price * $item->quantity, 2),
            ])->values(),
            'coupon' => $cart->coupon ? [
                'code' => $cart->coupon->code,
                'type' => $cart->coupon->type->value,
                'value' => (float) $cart->coupon->value,
            ] : null,
            'coupon_code' => $cart->coupon?->code,
            'subtotal' => round($subtotal, 2),
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'item_count' => $cart->items->sum('quantity'),
        ];
    }

    public function show(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);
        return $this->success($this->formatCart($cart));
    }

    public function addItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        if (! $product->is_active) {
            return $this->error('Product is not available');
        }

        $unitPrice = (float) $product->base_price;
        $variantId = $validated['variant_id'] ?? null;

        if ($variantId) {
            $variant = ProductVariant::where('id', $variantId)
                ->where('product_id', $product->id)
                ->firstOrFail();
            $unitPrice = (float) $variant->price;
        }

        $cart = $this->getOrCreateCart($request);

        $existingItem = $cart->items()
            ->where('product_id', $product->id)
            ->where('variant_id', $variantId)
            ->first();

        if ($existingItem) {
            $existingItem->update(['quantity' => $existingItem->quantity + $validated['quantity']]);
        } else {
            $cart->items()->create([
                'product_id' => $product->id,
                'variant_id' => $variantId,
                'quantity' => $validated['quantity'],
                'unit_price' => $unitPrice,
            ]);
        }

        $cart->refresh();
        return $this->success($this->formatCart($cart));
    }

    public function updateItem(Request $request, int $cartItem): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0|max:100',
        ]);

        $cart = $this->getOrCreateCart($request);
        $item = $cart->items()->findOrFail($cartItem);

        if ($validated['quantity'] === 0) {
            $item->delete();
        } else {
            $item->update(['quantity' => $validated['quantity']]);
        }

        $cart->refresh();
        return $this->success($this->formatCart($cart));
    }

    public function removeItem(Request $request, int $cartItem): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);
        $item = $cart->items()->findOrFail($cartItem);
        $item->delete();

        $cart->refresh();
        return $this->success($this->formatCart($cart));
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);
        $cart->items()->delete();
        $cart->update(['coupon_id' => null]);
        $cart->refresh();

        return $this->success($this->formatCart($cart));
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $coupon = Coupon::where('code', strtoupper($validated['code']))
            ->where('is_active', true)
            ->first();

        if (! $coupon) {
            return $this->error('Invalid or expired coupon code');
        }

        if ($coupon->expires_at && $coupon->expires_at < now()) {
            return $this->error('This coupon has expired');
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            return $this->error('This coupon has reached its usage limit');
        }

        $cart = $this->getOrCreateCart($request);
        $cart->update(['coupon_id' => $coupon->id]);
        $cart->refresh();

        return $this->success($this->formatCart($cart));
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);
        $cart->update(['coupon_id' => null]);
        $cart->refresh();

        return $this->success($this->formatCart($cart));
    }
}
