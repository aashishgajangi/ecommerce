<?php

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Api\V1\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->success(null, 'Orders — coming soon');
    }

    public function show(Request $request, int $order): JsonResponse
    {
        return $this->success(null, 'Order detail — coming soon');
    }

    public function cancel(Request $request, int $order): JsonResponse
    {
        return $this->success(null, 'Cancel order — coming soon');
    }
}
