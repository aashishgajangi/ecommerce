<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDetailResource extends JsonResource
{
    public function __construct(Product $resource, private bool $isWholesale = false)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'short_description' => $this->short_description,
            'base_price' => (float) $this->base_price,
            'effective_price' => $this->getEffectivePrice($this->isWholesale),
            'wholesale_price' => $this->when($this->isWholesale, (float) $this->wholesale_price),
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'tax_rate' => $this->whenLoaded('taxRate', fn() => [
                'rate' => (float) $this->taxRate->rate,
                'name' => $this->taxRate->name,
            ]),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'in_stock' => true,
            'reviews' => ReviewResource::collection($this->whenLoaded('reviews')),
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'is_featured' => $this->is_featured,
        ];
    }
}
