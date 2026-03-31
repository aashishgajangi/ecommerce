<?php

namespace App\Http\Controllers\Api\V1\Branch;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeliveryController extends ApiController
{
    /**
     * POST /delivery/options
     *
     * Body: { lat, lng, order_total? }
     *
     * Returns available branches with delivery fee and estimated time.
     * Uses Google Distance Matrix road distance for radius check, fee, and ETA.
     * Falls back to Haversine straight-line distance if Maps API is unavailable.
     */
    public function options(Request $request): JsonResponse
    {
        $request->validate([
            'lat'         => 'required|numeric|between:-90,90',
            'lng'         => 'required|numeric|between:-180,180',
            'order_total' => 'nullable|numeric|min:0',
            'show_all'    => 'nullable|boolean',
        ]);

        $lat        = (float) $request->lat;
        $lng        = (float) $request->lng;
        $orderTotal = (float) ($request->order_total ?? 0);
        $showAll    = (bool)  ($request->show_all ?? false);
        $mapsKey    = config('services.google_maps.key');

        // Load all active branches with coordinates
        $branches = Branch::active()
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->orderBy('sort_order')
            ->get();

        // Step 1: Pre-filter candidates.
        // Normal mode: 1.5× Haversine (road distance is ~20-40% longer than straight-line).
        // show_all mode: include every branch so the user can pick any store.
        $candidates = $showAll
            ? $branches->values()
            : $branches->filter(function (Branch $b) use ($lat, $lng) {
                $straight = $b->distanceFrom($lat, $lng);
                return $straight <= ((float) $b->service_radius_km * 1.5);
            })->values();

        if ($candidates->isEmpty()) {
            return $this->success([
                'location' => ['lat' => $lat, 'lng' => $lng],
                'branches' => [],
            ]);
        }

        // Step 2: Get road distances for all candidates in ONE Distance Matrix call
        $roadDistances = null;
        if ($mapsKey) {
            $roadDistances = $this->getRoadDistances($candidates->all(), $lat, $lng, $mapsKey);
        }

        // Step 3: Build response — in show_all mode keep every branch; otherwise filter by radius
        $eligible = $candidates
            ->map(function (Branch $b, int $i) use ($lat, $lng, $orderTotal, $roadDistances, $showAll) {
                // Use road distance if available, otherwise fall back to Haversine
                if ($roadDistances && isset($roadDistances[$i]) && $roadDistances[$i]['status'] === 'OK') {
                    $distanceKm = $roadDistances[$i]['distance_km'];
                    $etaMinutes = $roadDistances[$i]['eta_minutes'];
                } else {
                    $distanceKm = $b->distanceFrom($lat, $lng);
                    $etaMinutes = null;
                }

                $isRoadDistance = $roadDistances && isset($roadDistances[$i]) && $roadDistances[$i]['status'] === 'OK';
                $withinRadius   = $distanceKm <= (float) $b->service_radius_km;

                // In normal mode reject out-of-radius branches; in show_all keep them
                if (!$showAll && !$withinRadius) {
                    return null;
                }

                // Fee based on road distance (still calculated even if outside radius)
                $fee = $b->deliveryFeeForDistance($distanceKm);

                // Free delivery if order total exceeds threshold
                if ($b->free_delivery_above !== null && $orderTotal >= (float) $b->free_delivery_above) {
                    $fee = 0.0;
                }

                return [
                    'id'              => $b->id,
                    'branch_id'       => $b->id,
                    'name'            => $b->name,
                    'branch_name'     => $b->name,
                    'slug'            => $b->slug,
                    'branch_slug'     => $b->slug,
                    'address'         => trim("{$b->address_line1}, {$b->city}"),
                    'distance_km'     => round($distanceKm, 2),
                    'is_estimated'    => !$isRoadDistance, // true = Haversine fallback, false = real road km
                    'delivery_fee'    => $fee,
                    'within_radius'   => $withinRadius,
                    'free_delivery_above' => $b->free_delivery_above,
                    'opening_time'    => $b->opening_time,
                    'closing_time'    => $b->closing_time,
                    'days_open'       => $b->days_open,
                    'eta_minutes'     => $etaMinutes,
                    'lat'             => $b->lat,
                    'lng'             => $b->lng,
                    'google_maps_url' => $b->google_maps_url,
                ];
            })
            ->filter()
            ->sortBy('distance_km')
            ->values()
            ->all();

        return $this->success([
            'location' => ['lat' => $lat, 'lng' => $lng],
            'branches' => array_values($eligible),
        ]);
    }

    /**
     * Fetch road distances + ETAs for multiple branch destinations in one API call.
     * Returns array indexed by candidate position: ['status' => 'OK', 'distance_km' => x, 'eta_minutes' => y]
     */
    private function getRoadDistances(array $branches, float $lat, float $lng, string $apiKey): ?array
    {
        // Cache key: origin binned to ~1km grid + sorted branch IDs (stable key regardless of sort order)
        $originKey   = round($lat, 2) . ',' . round($lng, 2);
        $branchIds   = implode('-', array_map(fn (Branch $b) => $b->id, $branches));
        $cacheKey    = "dist_matrix:{$originKey}:{$branchIds}";

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $destinations = implode('|', array_map(
                fn (Branch $b) => "{$b->lat},{$b->lng}",
                $branches
            ));

            $response = Http::timeout(6)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                'origins'      => "{$lat},{$lng}",
                'destinations' => $destinations,
                'key'          => $apiKey,
                'units'        => 'metric',
                'mode'         => 'driving',
            ]);

            if (! $response->ok()) {
                Log::warning('Distance Matrix API HTTP error: ' . $response->status());
                return null;
            }

            // Check API-level status before processing
            $apiStatus = $response->json('status');
            if ($apiStatus !== 'OK') {
                Log::warning("Distance Matrix API denied/error — status: {$apiStatus}. "
                    . 'Enable the Distance Matrix API at https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com');
                return null; // Don't cache — allow retry once key is fixed
            }

            $rows = $response->json('rows.0.elements', []);
            $result = [];
            $hasAnyOk = false;

            foreach ($rows as $i => $el) {
                if (($el['status'] ?? '') === 'OK') {
                    $result[$i] = [
                        'status'       => 'OK',
                        'distance_km'  => round(($el['distance']['value'] ?? 0) / 1000, 2),
                        'eta_minutes'  => (int) ceil(($el['duration']['value'] ?? 0) / 60),
                    ];
                    $hasAnyOk = true;
                } else {
                    $result[$i] = ['status' => $el['status'] ?? 'UNKNOWN'];
                }
            }

            // Only cache when we got at least one valid result
            if ($hasAnyOk) {
                Cache::put($cacheKey, $result, now()->addMinutes(5));
            }

            return $result ?: null;
        } catch (\Throwable $e) {
            Log::warning('Distance Matrix API exception: ' . $e->getMessage());
            return null;
        }
    }
}
