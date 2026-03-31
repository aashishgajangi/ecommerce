<?php

namespace App\Http\Controllers\Api\V1\Payment;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Razorpay\Api\Api as RazorpayApi;

class PaymentController extends ApiController
{
    private RazorpayApi $razorpay;

    public function __construct()
    {
        $this->razorpay = new RazorpayApi(
            config('services.razorpay.key'),
            config('services.razorpay.secret')
        );
    }

    /**
     * Re-initiate payment for an existing pending order (retry flow).
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
        ]);

        $order = Order::where('id', $validated['order_id'])
            ->where('user_id', $request->user()->id)
            ->where('status', OrderStatus::Pending)
            ->firstOrFail();

        // Re-use existing Razorpay order if available
        $payment = $order->payment;
        if ($payment && $payment->gateway_order_id) {
            return $this->success([
                'razorpay_order_id' => $payment->gateway_order_id,
                'amount'            => (int) round((float) $order->total * 100),
                'currency'          => $order->currency ?? 'INR',
                'key_id'            => config('services.razorpay.key'),
            ]);
        }

        $rzpOrder = $this->razorpay->order->create([
            'amount'          => (int) round((float) $order->total * 100),
            'currency'        => $order->currency ?? 'INR',
            'receipt'         => $order->order_number,
            'payment_capture' => 1,
        ]);

        if ($payment) {
            $payment->update([
                'gateway'          => 'razorpay',
                'gateway_order_id' => $rzpOrder->id,
            ]);
        } else {
            Payment::create([
                'order_id'         => $order->id,
                'gateway'          => 'razorpay',
                'gateway_order_id' => $rzpOrder->id,
                'method'           => 'razorpay',
                'amount'           => $order->total,
                'currency'         => $order->currency ?? 'INR',
                'status'           => PaymentStatus::Pending,
            ]);
        }

        return $this->success([
            'razorpay_order_id' => $rzpOrder->id,
            'amount'            => (int) round((float) $order->total * 100),
            'currency'          => $order->currency ?? 'INR',
            'key_id'            => config('services.razorpay.key'),
        ]);
    }

    /**
     * Verify signature after frontend receives payment callback.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id'             => 'required|integer|exists:orders,id',
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'required|string',
        ]);

        $order = Order::where('id', $validated['order_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        // Verify HMAC signature
        $generated = hash_hmac(
            'sha256',
            $validated['razorpay_order_id'] . '|' . $validated['razorpay_payment_id'],
            config('services.razorpay.secret')
        );

        if (! hash_equals($generated, $validated['razorpay_signature'])) {
            Log::warning('Razorpay signature mismatch', ['order_id' => $order->id]);

            return $this->error('Payment verification failed', 422);
        }

        DB::transaction(function () use ($order, $validated) {
            $payment = $order->payments()
                ->where('gateway_order_id', $validated['razorpay_order_id'])
                ->first();

            if ($payment) {
                $payment->update([
                    'status'             => PaymentStatus::Captured,
                    'gateway_payment_id' => $validated['razorpay_payment_id'],
                ]);
            }

            if ($order->status === OrderStatus::Pending) {
                $order->update(['status' => OrderStatus::Confirmed]);
            }

            // Clear cart now that payment is confirmed
            $cart = Cart::where('user_id', $order->user_id)->first();
            if ($cart) {
                $cart->items()->delete();
                $cart->update(['coupon_id' => null]);
            }
        });

        return $this->success([
            'order_id'     => $order->id,
            'order_number' => $order->order_number,
            'status'       => $order->fresh()->status->value,
        ], 'Payment verified successfully');
    }

    /**
     * Razorpay webhook — handles async payment events.
     */
    public function webhook(Request $request): JsonResponse
    {
        $webhookSecret = config('services.razorpay.webhook_secret');
        $signature     = $request->header('X-Razorpay-Signature');
        $body          = $request->getContent();

        if ($webhookSecret && $signature) {
            $expected = hash_hmac('sha256', $body, $webhookSecret);
            if (! hash_equals($expected, $signature)) {
                Log::warning('Razorpay webhook signature mismatch');

                return response()->json(['status' => 'invalid_signature'], 400);
            }
        }

        $event   = $request->input('event');
        $payload = $request->input('payload.payment.entity');

        if (! $payload) {
            return response()->json(['status' => 'ok']);
        }

        $rzpOrderId   = $payload['order_id'] ?? null;
        $rzpPaymentId = $payload['id'] ?? null;

        if (! $rzpOrderId) {
            return response()->json(['status' => 'ok']);
        }

        $payment = Payment::where('gateway_order_id', $rzpOrderId)->first();
        if (! $payment) {
            return response()->json(['status' => 'ok']);
        }

        DB::transaction(function () use ($event, $payment, $rzpPaymentId, $payload) {
            if ($event === 'payment.captured') {
                $payment->update([
                    'status'             => PaymentStatus::Captured,
                    'gateway_payment_id' => $rzpPaymentId,
                    'gateway_response'   => $payload,
                ]);

                $order = $payment->order;
                if ($order && $order->status === OrderStatus::Pending) {
                    $order->update(['status' => OrderStatus::Confirmed]);
                }
            } elseif ($event === 'payment.failed') {
                $payment->update([
                    'status'             => PaymentStatus::Failed,
                    'gateway_payment_id' => $rzpPaymentId,
                    'gateway_response'   => $payload,
                ]);
            }
        });

        return response()->json(['status' => 'ok']);
    }
}
