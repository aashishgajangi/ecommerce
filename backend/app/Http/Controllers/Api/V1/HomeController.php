<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\BannerResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class HomeController extends ApiController
{
    public function index(): JsonResponse
    {
        $banners = Banner::active()->orderBy('sort_order')->get();

        $featuredCategories = Category::active()
            ->roots()
            ->orderBy('sort_order')
            ->limit(8)
            ->get();

        $featuredProducts = Product::active()
            ->featured()
            ->with(['primaryImage', 'brand'])
            ->latest()
            ->limit(12)
            ->get();

        $newArrivals = Product::active()
            ->with(['primaryImage', 'brand'])
            ->latest()
            ->limit(8)
            ->get();

        return $this->success([
            'banners' => BannerResource::collection($banners),
            'featured_categories' => CategoryResource::collection($featuredCategories),
            'featured_products' => ProductResource::collection($featuredProducts),
            'new_arrivals' => ProductResource::collection($newArrivals),
        ]);
    }
}
