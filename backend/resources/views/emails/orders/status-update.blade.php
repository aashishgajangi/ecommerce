<x-mail::message>
# Hi {{ $customerName }},

@php
$messages = [
    'confirmed'        => 'Great news! Your order has been **confirmed** and will be prepared soon.',
    'processing'       => 'Your order is now being **prepared with love** at our kitchen.',
    'shipped'          => 'Your order is **on its way!** Our delivery partner has picked it up.',
    'out_for_delivery' => 'Almost there! Your order is **out for delivery** and should arrive shortly.',
    'delivered'        => 'Your order has been **delivered**. We hope you love it!',
    'cancelled'        => 'Your order has been **cancelled** as requested.',
    'refunded'         => 'Your **refund has been processed**. It may take 5–7 business days to reflect.',
];
$statusMsg = $messages[$order->status->value] ?? "Your order status has been updated to **{$newStatus}**.";
@endphp

{!! $statusMsg !!}

**Order:** #{{ $order->order_number }}
**Status:** {{ $newStatus }}

---

@if($order->items && $order->items->count())
## Your Items

| Product | Qty | Price |
|---------|-----|-------|
@foreach($order->items as $item)
| {{ $item->product_name ?? $item->product?->name ?? 'Item' }}{{ $item->variant_sku ? ' ('.$item->variant_sku.')' : '' }} | {{ $item->quantity }} | ₹{{ number_format($item->subtotal, 2) }} |
@endforeach

---
@endif

## Order Total

| | |
|--|--|
| Subtotal | ₹{{ number_format($order->subtotal, 2) }} |
@if($order->discount_amount > 0)
| Discount | −₹{{ number_format($order->discount_amount, 2) }} |
@endif
| Tax | ₹{{ number_format($order->tax_amount, 2) }} |
| Delivery | ₹{{ number_format($order->shipping_amount, 2) }} |
| **Total** | **₹{{ number_format($order->total, 2) }}** |

<x-mail::button :url="$trackUrl" color="red">
Track Your Order
</x-mail::button>

Thank you for choosing **Hangout Cakes**. If you have any questions, reply to this email.

Warm regards,
The Hangout Cakes Team
</x-mail::message>
