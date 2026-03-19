<?php

namespace App\Enums;

enum RefundStatus: string
{
    case Pending = 'pending';
    case Processed = 'processed';
    case Failed = 'failed';

    public function label(): string
    {
        return match($this) {
            RefundStatus::Pending => 'Pending',
            RefundStatus::Processed => 'Processed',
            RefundStatus::Failed => 'Failed',
        };
    }

    public function color(): string
    {
        return match($this) {
            RefundStatus::Pending => 'warning',
            RefundStatus::Processed => 'success',
            RefundStatus::Failed => 'danger',
        };
    }
}
