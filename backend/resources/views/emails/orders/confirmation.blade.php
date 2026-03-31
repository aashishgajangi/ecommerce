<x-mail::message>
# Thank you for your order, {{ $customerName }}! 🎂

Your order has been confirmed and we're getting it ready for you.

<x-mail::panel>
**Order:** #{{ $order->order_number }}
**Date:** {{ $order->created_at->format('d M Y, h:i A') }}
**Status:** {{ ucfirst($order->status->value) }}
@if($order->branch)
**Delivering from:** {{ $order->branch->name }}
@endif
</x-mail::panel>

## Order Items

@foreach($order->items as $item)
- **{{ $item->product_name }}**@if($item->variant_label) ({{ $item->variant_label }})@endif
  Qty: {{ $item->quantity }} × ₹{{ number_format($item->unit_price, 2) }} = **₹{{ number_format($item->total, 2) }}**
@endforeach

---

## Bill Summary

| | |
|---|---|
| Subtotal | ₹{{ number_format($order->subtotal, 2) }} |
@if($order->discount_amount > 0)
| Discount | −₹{{ number_format($order->discount_amount, 2) }} |
@endif
| Tax (GST) | ₹{{ number_format($order->tax_amount, 2) }} |
@if($order->shipping_amount > 0)
| Delivery | ₹{{ number_format($order->shipping_amount, 2) }} |
@else
| Delivery | Free |
@endif
| **Total** | **₹{{ number_format($order->total, 2) }}** |

## Delivery Address

{{ $order->shipping_address['name'] }}
{{ $order->shipping_address['line1'] }}
{{ $order->shipping_address['city'] }}, {{ $order->shipping_address['state'] }} — {{ $order->shipping_address['pincode'] }}
📞 {{ $order->shipping_address['phone'] }}

<x-mail::button :url="$trackUrl" color="red">
Track Your Order
</x-mail::button>

We'll notify you when your order is out for delivery.

For questions, reply to this email or call us. We're always happy to help!

With love,
**Team Hangout Cakes** 🍰

---
<small>You're receiving this because you placed an order on Hangout Cakes. Questions? Email us at aashish@hangoutcakes.com</small>
</x-mail::message>
