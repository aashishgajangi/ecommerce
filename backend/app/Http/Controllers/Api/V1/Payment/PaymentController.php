<?php

namespace App\Http\Controllers\Api\V1\Payment;

use App\Http\Controllers\Api\V1\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends ApiController
{
    public function initiate(Request $request): JsonResponse
    {
        return $this->success(null, 'Payment initiate — coming soon');
    }

    public function verify(Request $request): JsonResponse
    {
        return $this->success(null, 'Payment verify — coming soon');
    }

    public function webhook(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }
}
