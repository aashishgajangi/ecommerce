<?php

namespace App\Http\Controllers\Api\V1\Order;

use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Jobs\SendOrderConfirmationEmail;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Razorpay\Api\Api as RazorpayApi;

class CheckoutController extends ApiController
{
    public function summary(Request $request): JsonResponse
    {
        $cart = Cart::where('user_id', $request->user()->id)
            ->with(['items.product', 'items.variant', 'coupon'])
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            return $this->error('Your cart is empty', 422);
        }

        return $this->success(['cart_id' => $cart->id, 'item_count' => $cart->items->sum('quantity')]);
    }

    public function place(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipping_address'          => 'required|array',
            'shipping_address.name'     => 'required|string|max:255',
            'shipping_address.phone'    => 'required|string|max:20',
            'shipping_address.line1'    => 'required|string|max:255',
            'shipping_address.city'     => 'required|string|max:100',
            'shipping_address.state'    => 'required|string|max:100',
            'shipping_address.pincode'  => 'required|string|max:20',
            'billing_address'           => 'nullable|array',
            'payment_method'            => 'required|in:cod,razorpay',
            'branch_id'                 => 'nullable|integer|exists:branches,id',
            'delivery_fee'              => 'nullable|numeric|min:0',
            'notes'                     => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $cart = Cart::where('user_id', $user->id)
            ->with(['items.product', 'items.variant', 'coupon'])
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            return $this->error('Your cart is empty', 422);
        }

        // Calculate totals
        $subtotal       = $cart->items->sum(fn ($i) => (float) $i->unit_price * $i->quantity);
        $deliveryFee    = (float) ($validated['delivery_fee'] ?? 0);
        $discountAmount = 0.0;

        if ($cart->coupon) {
            $discountAmount = $cart->coupon->calculateDiscount($subtotal);
        }

        $taxableAmount = $subtotal - $discountAmount;
        $taxAmount     = round($taxableAmount * 0.18, 2);
        $total         = round($taxableAmount + $taxAmount + $deliveryFee, 2);
        $billingAddress = $validated['billing_address'] ?? $validated['shipping_address'];

        $order = DB::transaction(function () use (
            $cart, $user, $validated,
            $subtotal, $discountAmount, $taxAmount, $deliveryFee, $total, $billingAddress
        ) {
            $order = Order::create([
                'user_id'          => $user->id,
                'branch_id'        => $validated['branch_id'] ?? null,
                'status'           => OrderStatus::Pending,
                'subtotal'         => $subtotal,
                'discount_amount'  => $discountAmount,
                'tax_amount'       => $taxAmount,
                'shipping_amount'  => $deliveryFee,
                'total'            => $total,
                'currency'         => 'INR',
                'coupon_id'        => $cart->coupon_id,
                'shipping_address' => $validated['shipping_address'],
                'billing_address'  => $billingAddress,
                'notes'            => $validated['notes'] ?? null,
            ]);

            foreach ($cart->items as $item) {
                OrderItem::create([
                    'order_id'        => $order->id,
                    'product_id'      => $item->product_id,
                    'variant_id'      => $item->variant_id,
                    'product_name'    => $item->product->name,
                    'variant_label'   => $item->variant?->sku,
                    'sku'             => $item->variant?->sku ?? $item->product->sku_prefix ?? '',
                    'quantity'        => $item->quantity,
                    'unit_price'      => $item->unit_price,
                    'discount_amount' => 0,
                    'tax_amount'      => 0,
                    'total'           => round((float) $item->unit_price * $item->quantity, 2),
                ]);
            }

            Payment::create([
                'order_id' => $order->id,
                'method'   => $validated['payment_method'],
                'status'   => PaymentStatus::Pending,
                'amount'   => $total,
                'currency' => 'INR',
            ]);

            if ($cart->coupon_id) {
                $cart->coupon->increment('usage_count');
                // Record per-user usage
                $cart->coupon->usages()->create(['user_id' => $order->user_id, 'order_id' => $order->id]);
            }

            if ($validated['payment_method'] === 'cod') {
                $cart->items()->delete();
                $cart->update(['coupon_id' => null]);
            }

            return $order;
        });

        // Dispatch confirmation email (queued, non-blocking)
        SendOrderConfirmationEmail::dispatch($order->id)->onQueue('emails');

        if ($validated['payment_method'] === 'razorpay') {
            $rzp = new RazorpayApi(
                config('services.razorpay.key'),
                config('services.razorpay.secret')
            );

            $rzpOrder = $rzp->order->create([
                'amount'          => (int) round($total * 100),
                'currency'        => 'INR',
                'receipt'         => $order->order_number,
                'payment_capture' => 1,
            ]);

            Payment::where('order_id', $order->id)->latest('id')->first()?->update([
                'gateway'          => 'razorpay',
                'gateway_order_id' => $rzpOrder->id,
            ]);

            return $this->created([
                'id'                => $order->id,
                'order_number'      => $order->order_number,
                'status'            => $order->status->value,
                'total'             => $total,
                'payment_method'    => 'razorpay',
                'razorpay_order_id' => $rzpOrder->id,
                'amount'            => (int) round($total * 100),
                'currency'          => 'INR',
                'key_id'            => config('services.razorpay.key'),
            ]);
        }

        return $this->created([
            'id'             => $order->id,
            'order_number'   => $order->order_number,
            'status'         => $order->status->value,
            'total'          => (float) $order->total,
            'payment_method' => $validated['payment_method'],
        ]);
    }

    public function shippingRates(Request $request): JsonResponse
    {
        return $this->success([
            ['id' => 'standard', 'label' => 'Standard Delivery', 'amount' => 0, 'days' => '3-5'],
        ]);
    }
}
