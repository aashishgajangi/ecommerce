<?php

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends ApiController
{
    public function index(Product $product): JsonResponse
    {
        $reviews = Review::approved()
            ->where('product_id', $product->id)
            ->with('user')
            ->latest()
            ->paginate(10);

        return $this->success(ReviewResource::collection($reviews)->response()->getData(true));
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:2000'],
        ]);

        $existing = Review::where('product_id', $product->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            return $this->error('You have already reviewed this product.', 422);
        }

        $review = Review::create([
            ...$data,
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'is_approved' => false,
        ]);

        return $this->created(new ReviewResource($review->load('user')), 'Review submitted for approval');
    }
}
