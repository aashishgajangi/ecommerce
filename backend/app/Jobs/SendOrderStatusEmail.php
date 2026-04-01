<?php

namespace App\Jobs;

use App\Mail\OrderStatusUpdatedMail;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendOrderStatusEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly int $orderId,
        public readonly string $previousStatus,
    ) {}

    public function handle(): void
    {
        $order = Order::with(['user', 'items.product', 'branch'])->find($this->orderId);
        if (!$order) return;

        $email = $order->shipping_address['email'] ?? $order->user?->email ?? null;
        if (!$email) return;

        Mail::to($email)->send(new OrderStatusUpdatedMail($order, $this->previousStatus));
    }
}
