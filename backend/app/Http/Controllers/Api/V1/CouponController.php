<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends ApiController
{
    public function validate(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $coupon = Coupon::where('code', strtoupper($request->code))->first();

        if (! $coupon || ! $coupon->isValid()) {
            return $this->error('Invalid or expired coupon code.', 422);
        }

        if ($coupon->min_order_amount && $request->subtotal < $coupon->min_order_amount) {
            return $this->error(
                "Minimum order amount of ₹{$coupon->min_order_amount} required.",
                422
            );
        }

        if ($coupon->per_user_limit) {
            $usageCount = $coupon->usages()->where('user_id', $request->user()->id)->count();
            if ($usageCount >= $coupon->per_user_limit) {
                return $this->error('You have already used this coupon.', 422);
            }
        }

        $discount = $coupon->calculateDiscount((float) $request->subtotal);

        return $this->success([
            'coupon' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type->value,
                'value' => (float) $coupon->value,
                'description' => $coupon->type->format((float) $coupon->value),
            ],
            'discount_amount' => $discount,
        ]);
    }
}
