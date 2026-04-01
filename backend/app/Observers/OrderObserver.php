<?php

namespace App\Observers;

use App\Jobs\SendOrderStatusEmail;
use App\Models\Order;

class OrderObserver
{
    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            $previousStatus = $order->getRawOriginal('status'); // getRawOriginal returns string, getOriginal returns cast enum
            SendOrderStatusEmail::dispatch($order->id, $previousStatus)->onQueue('emails');
        }
    }
}
