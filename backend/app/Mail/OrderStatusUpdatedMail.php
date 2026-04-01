<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly string $previousStatus,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order #{$this->order->order_number} — {$this->order->status->label()} — Hangout Cakes",
        );
    }

    public function content(): Content
    {
        $order = $this->order->load(['items.product', 'branch']);

        return new Content(
            markdown: 'emails.orders.status-update',
            with: [
                'order'        => $order,
                'customerName' => $order->shipping_address['name'] ?? $order->user?->name ?? 'Customer',
                'trackUrl'     => rtrim(config('app.frontend_url', 'https://order.hangoutcakes.com'), '/') . '/orders/' . $order->id,
                'newStatus'    => $order->status->label(),
            ],
        );
    }
}
