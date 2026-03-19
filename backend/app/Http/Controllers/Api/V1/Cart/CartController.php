<?php

namespace App\Http\Controllers\Api\V1\Cart;

use App\Http\Controllers\Api\V1\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends ApiController
{
    public function show(Request $request): JsonResponse
    {
        // TODO: implement full cart logic
        return $this->success(null, 'Cart endpoint — coming soon');
    }

    public function addItem(Request $request): JsonResponse
    {
        return $this->success(null, 'Add item — coming soon');
    }

    public function updateItem(Request $request, int $cartItem): JsonResponse
    {
        return $this->success(null, 'Update item — coming soon');
    }

    public function removeItem(Request $request, int $cartItem): JsonResponse
    {
        return $this->success(null, 'Remove item — coming soon');
    }

    public function clear(Request $request): JsonResponse
    {
        return $this->success(null, 'Clear cart — coming soon');
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        return $this->success(null, 'Apply coupon — coming soon');
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        return $this->success(null, 'Remove coupon — coming soon');
    }
}
