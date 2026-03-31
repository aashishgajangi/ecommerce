<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'is_default' => $this->is_default,
            'is_active' => $this->is_active,
            'attribute_values' => $this->whenLoaded('attributeValues', fn() =>
                $this->attributeValues->map(fn($av) => [
                    'attribute' => $av->attribute->name,
                    'value' => $av->value,
                ])
            ),
            'in_stock' => $this->whenLoaded('inventory', fn() => $this->inventory?->isInStock()),
            'available_quantity' => $this->whenLoaded('inventory', fn() => $this->inventory?->available_quantity),
        ];
    }
}
