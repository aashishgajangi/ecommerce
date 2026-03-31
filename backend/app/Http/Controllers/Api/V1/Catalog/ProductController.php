<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductDetailResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::active()
            ->with(['primaryImage', 'brand', 'categories'])
            ->when($request->category, fn($q) => $q->whereHas('categories', fn($c) => $c->where('slug', $request->category)))
            ->when($request->brand, fn($q) => $q->whereHas('brand', fn($b) => $b->where('slug', $request->brand)))
            ->when($request->featured, fn($q) => $q->featured())
            ->when($request->search, fn($q) => $q->where('name', 'ilike', "%{$request->search}%"))
            ->when($request->min_price, fn($q) => $q->where('base_price', '>=', $request->min_price))
            ->when($request->max_price, fn($q) => $q->where('base_price', '<=', $request->max_price));

        $sortField = match($request->sort) {
            'price_asc' => ['base_price', 'asc'],
            'price_desc' => ['base_price', 'desc'],
            'newest' => ['created_at', 'desc'],
            default => ['created_at', 'desc'],
        };

        $products = $query->orderBy(...$sortField)
            ->paginate($request->integer('per_page', 24));

        return $this->success(ProductResource::collection($products)->response()->getData(true));
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $product = Product::active()
            ->where('slug', $slug)
            ->with([
                'brand',
                'categories',
                'images',
                'taxRate',
                'variants.attributeValues.attribute',
                'variants.inventory',
                'reviews' => fn($q) => $q->approved()->latest()->limit(10),
            ])
            ->firstOrFail();

        $isWholesale = $request->user()?->isWholesale() ?? false;

        return $this->success(new ProductDetailResource($product, $isWholesale));
    }
}
