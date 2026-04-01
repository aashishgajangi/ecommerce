<?php

namespace App\Observers;

use App\Jobs\SendOrderStatusEmail;
use App\Models\Order;

class OrderObserver
{
    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            $previousStatus = $order->getOriginal('status');
            SendOrderStatusEmail::dispatch($order->id, (string) $previousStatus)->onQueue('emails');
        }
    }
}
