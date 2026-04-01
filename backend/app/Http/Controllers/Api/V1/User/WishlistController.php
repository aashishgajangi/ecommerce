<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $wishlist = $request->user()->wishlist()
            ->with(['product.primaryImage', 'product.brand'])
            ->get()
            ->pluck('product');

        return $this->success(ProductResource::collection($wishlist));
    }

    public function toggle(Request $request, Product $product): JsonResponse
    {
        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return $this->success(['wishlisted' => false], 'Removed from wishlist');
        }

        Wishlist::create([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
        ]);

        return $this->success(['wishlisted' => true], 'Added to wishlist');
    }
}
