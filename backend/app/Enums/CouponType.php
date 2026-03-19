<?php

namespace App\Enums;

enum CouponType: string
{
    case Percentage = 'percentage';
    case Fixed = 'fixed';
    case FreeShipping = 'free_shipping';

    public function label(): string
    {
        return match($this) {
            CouponType::Percentage => 'Percentage Discount',
            CouponType::Fixed => 'Fixed Amount Discount',
            CouponType::FreeShipping => 'Free Shipping',
        };
    }

    public function format(float $value): string
    {
        return match($this) {
            CouponType::Percentage => "{$value}% off",
            CouponType::Fixed => '₹' . number_format($value, 2) . ' off',
            CouponType::FreeShipping => 'Free Shipping',
        };
    }
}
