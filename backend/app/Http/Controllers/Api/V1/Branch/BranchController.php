<?php

namespace App\Http\Controllers\Api\V1\Branch;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends ApiController
{
    /** GET /branches — list all active branches */
    public function index(): JsonResponse
    {
        $branches = Branch::active()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Branch $b) => $this->formatBranch($b));

        return $this->success($branches);
    }

    /** GET /branches/{slug} — single branch detail */
    public function show(string $slug): JsonResponse
    {
        $branch = Branch::active()->where('slug', $slug)->firstOrFail();

        return $this->success($this->formatBranch($branch, detail: true));
    }

    /**
     * GET /branches/nearby?lat=&lng=
     * Returns branches within service radius, sorted by distance.
     */
    public function nearby(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $lat = (float) $request->lat;
        $lng = (float) $request->lng;

        $branches = Branch::active()
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Branch $b) use ($lat, $lng) {
                $distance = $b->distanceFrom($lat, $lng);
                return array_merge($this->formatBranch($b), [
                    'distance_km'   => $distance,
                    'within_radius' => $distance <= (float) $b->service_radius_km,
                    'delivery_fee'  => $b->deliveryFeeForDistance($distance),
                ]);
            })
            ->filter(fn ($b) => $b['within_radius'])
            ->sortBy('distance_km')
            ->values();

        return $this->success($branches);
    }

    private function formatBranch(Branch $b, bool $detail = false): array
    {
        $data = [
            'id'               => $b->id,
            'name'             => $b->name,
            'slug'             => $b->slug,
            'city'             => $b->city,
            'state'            => $b->state,
            'pincode'          => $b->pincode,
            'phone'            => $b->phone,
            'lat'              => $b->lat,
            'lng'              => $b->lng,
            'service_radius_km' => $b->service_radius_km,
            'delivery_base_fee' => $b->delivery_base_fee,
            'delivery_per_km_fee' => $b->delivery_per_km_fee,
            'free_delivery_above' => $b->free_delivery_above,
            'opening_time'     => $b->opening_time,
            'closing_time'     => $b->closing_time,
            'days_open'        => $b->days_open,
            'google_maps_url'  => $b->google_maps_url,
            'google_place_id'  => $b->google_place_id,
        ];

        if ($detail) {
            $data['address_line1'] = $b->address_line1;
            $data['address_line2'] = $b->address_line2;
            $data['email']         = $b->email;
        }

        return $data;
    }
}
