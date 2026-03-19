<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Authorized = 'authorized';
    case Captured = 'captured';
    case Failed = 'failed';
    case Refunded = 'refunded';
    case PartiallyRefunded = 'partially_refunded';

    public function label(): string
    {
        return match($this) {
            PaymentStatus::Pending => 'Pending',
            PaymentStatus::Authorized => 'Authorized',
            PaymentStatus::Captured => 'Captured',
            PaymentStatus::Failed => 'Failed',
            PaymentStatus::Refunded => 'Refunded',
            PaymentStatus::PartiallyRefunded => 'Partially Refunded',
        };
    }

    public function color(): string
    {
        return match($this) {
            PaymentStatus::Pending => 'warning',
            PaymentStatus::Authorized => 'info',
            PaymentStatus::Captured => 'success',
            PaymentStatus::Failed => 'danger',
            PaymentStatus::Refunded => 'gray',
            PaymentStatus::PartiallyRefunded => 'warning',
        };
    }

    public function isPaid(): bool
    {
        return $this === PaymentStatus::Captured;
    }
}
