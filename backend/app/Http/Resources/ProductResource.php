<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'base_price' => (float) $this->base_price,
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'primary_image' => new ProductImageResource($this->whenLoaded('primaryImage')),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'in_stock' => true,
            'is_featured' => $this->is_featured,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
