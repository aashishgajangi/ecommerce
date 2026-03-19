<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;

class BrandController extends ApiController
{
    public function index(): JsonResponse
    {
        $brands = Brand::active()->orderBy('name')->get();

        return $this->success(BrandResource::collection($brands));
    }
}
