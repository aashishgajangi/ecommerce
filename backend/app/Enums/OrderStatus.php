<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case OutForDelivery = 'out_for_delivery';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match($this) {
            OrderStatus::Pending => 'Pending',
            OrderStatus::Confirmed => 'Confirmed',
            OrderStatus::Processing => 'Processing',
            OrderStatus::Shipped => 'Shipped',
            OrderStatus::OutForDelivery => 'Out for Delivery',
            OrderStatus::Delivered => 'Delivered',
            OrderStatus::Cancelled => 'Cancelled',
            OrderStatus::Refunded => 'Refunded',
        };
    }

    public function color(): string
    {
        return match($this) {
            OrderStatus::Pending => 'warning',
            OrderStatus::Confirmed => 'info',
            OrderStatus::Processing => 'info',
            OrderStatus::Shipped => 'primary',
            OrderStatus::OutForDelivery => 'primary',
            OrderStatus::Delivered => 'success',
            OrderStatus::Cancelled => 'danger',
            OrderStatus::Refunded => 'gray',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [
            OrderStatus::Delivered,
            OrderStatus::Cancelled,
            OrderStatus::Refunded,
        ]);
    }

    public function canTransitionTo(OrderStatus $next): bool
    {
        $allowed = match($this) {
            OrderStatus::Pending => [OrderStatus::Confirmed, OrderStatus::Cancelled],
            OrderStatus::Confirmed => [OrderStatus::Processing, OrderStatus::Cancelled],
            OrderStatus::Processing => [OrderStatus::Shipped, OrderStatus::Cancelled],
            OrderStatus::Shipped => [OrderStatus::OutForDelivery, OrderStatus::Delivered],
            OrderStatus::OutForDelivery => [OrderStatus::Delivered],
            OrderStatus::Delivered => [OrderStatus::Refunded],
            default => [],
        };

        return in_array($next, $allowed);
    }
}
