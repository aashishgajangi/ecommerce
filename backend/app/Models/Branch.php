<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Branch extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'pincode',
        'lat',
        'lng',
        'phone',
        'email',
        'service_radius_km',
        'delivery_base_fee',
        'delivery_per_km_fee',
        'free_delivery_above',
        'opening_time',
        'closing_time',
        'days_open',
        'google_place_id',
        'google_maps_url',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'lat'                  => 'float',
            'lng'                  => 'float',
            'service_radius_km'    => 'float',
            'delivery_base_fee'    => 'decimal:2',
            'delivery_per_km_fee'  => 'decimal:2',
            'free_delivery_above'  => 'decimal:2',
            'days_open'            => 'array',
            'is_active'            => 'boolean',
        ];
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(BranchInventory::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Haversine distance in km from a given lat/lng */
    public function distanceFrom(float $lat, float $lng): float
    {
        $earthKm = 6371;
        $dLat = deg2rad($lat - (float) $this->lat);
        $dLng = deg2rad($lng - (float) $this->lng);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad((float) $this->lat)) * cos(deg2rad($lat)) * sin($dLng / 2) ** 2;

        return round($earthKm * 2 * asin(sqrt($a)), 2);
    }

    /** Delivery fee for a given straight-line distance */
    public function deliveryFeeForDistance(float $distanceKm): float
    {
        if ($this->free_delivery_above !== null && (float) $this->free_delivery_above <= 0) {
            return 0.0;
        }
        return round((float) $this->delivery_base_fee + ((float) $this->delivery_per_km_fee * $distanceKm), 2);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Auto-geocode the branch address whenever lat/lng is missing or the address fields change.
     */
    public function geocodeAddress(): void
    {
        $key = config('services.google_maps.key');
        if (! $key) {
            return;
        }

        $address = implode(', ', array_filter([
            $this->address_line1,
            $this->address_line2,
            $this->city,
            $this->state,
            $this->pincode,
            'India',
        ]));

        if (! $address) {
            return;
        }

        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $address,
                'key'     => $key,
            ]);

            $location = $response->json('results.0.geometry.location');
            if ($location) {
                $this->lat = $location['lat'];
                $this->lng = $location['lng'];
            }
        } catch (\Throwable $e) {
            Log::warning("Branch geocode failed for [{$this->name}]: " . $e->getMessage());
        }
    }

    protected static function boot(): void
    {
        parent::boot();

        // Auto-geocode on create/update when lat/lng is missing
        static::saving(function (self $branch) {
            if (! $branch->lat || ! $branch->lng) {
                $branch->geocodeAddress();
            }
        });
    }
}
