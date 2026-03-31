<?php

namespace App\Http\Controllers\Api\V1\Order;

use App\Enums\OrderStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with(['items.product.primaryImage', 'payment'])
            ->orderByDesc('created_at')
            ->paginate(10);

        return $this->success([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, int $order): JsonResponse
    {
        $order = Order::where('user_id', $request->user()->id)
            ->with(['items.product.primaryImage', 'items.variant', 'payment', 'shipment'])
            ->find($order);

        if (! $order) {
            return $this->notFound('Order not found');
        }

        return $this->success($order);
    }

    public function cancel(Request $request, int $order): JsonResponse
    {
        $order = Order::where('user_id', $request->user()->id)->find($order);

        if (! $order) {
            return $this->notFound('Order not found');
        }

        if (! in_array($order->status, [OrderStatus::Pending, OrderStatus::Confirmed])) {
            return $this->error('Order cannot be cancelled at this stage', 422);
        }

        $order->update(['status' => OrderStatus::Cancelled]);

        return $this->success(['id' => $order->id, 'status' => $order->status->value]);
    }
}
