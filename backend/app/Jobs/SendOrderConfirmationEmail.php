<?php

namespace App\Jobs;

use App\Mail\OrderConfirmationMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmationEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 60; // seconds between retries

    public function __construct(public readonly int $orderId) {}

    public function handle(): void
    {
        $order = Order::with(['user', 'items.product', 'items.variant', 'branch'])
            ->find($this->orderId);

        if (! $order) {
            return;
        }

        $email = $order->shipping_address['email']
            ?? $order->user->email
            ?? null;

        if (! $email) {
            return;
        }

        Mail::to($email)->send(new OrderConfirmationMail($order));
    }
}
