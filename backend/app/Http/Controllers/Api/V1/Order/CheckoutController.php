<?php

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Api\V1\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends ApiController
{
    public function summary(Request $request): JsonResponse
    {
        return $this->success(null, 'Checkout summary — coming soon');
    }

    public function place(Request $request): JsonResponse
    {
        return $this->success(null, 'Place order — coming soon');
    }

    public function shippingRates(Request $request): JsonResponse
    {
        return $this->success(null, 'Shipping rates — coming soon');
    }
}
