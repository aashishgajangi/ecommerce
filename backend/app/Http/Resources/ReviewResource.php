<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'user' => [
                'name' => $this->user->name,
                'avatar_url' => $this->user->avatar_url,
            ],
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
