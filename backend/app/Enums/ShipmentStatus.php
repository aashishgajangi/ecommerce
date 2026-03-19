<?php

namespace App\Enums;

enum ShipmentStatus: string
{
    case Pending = 'pending';
    case Dispatched = 'dispatched';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Failed = 'failed';
    case Returned = 'returned';

    public function label(): string
    {
        return match($this) {
            ShipmentStatus::Pending => 'Pending',
            ShipmentStatus::Dispatched => 'Dispatched',
            ShipmentStatus::InTransit => 'In Transit',
            ShipmentStatus::Delivered => 'Delivered',
            ShipmentStatus::Failed => 'Failed',
            ShipmentStatus::Returned => 'Returned',
        };
    }
}
