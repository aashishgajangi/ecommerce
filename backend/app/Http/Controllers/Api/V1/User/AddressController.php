<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\UserAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()->get();
        return $this->success($addresses);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['required', 'string', 'max:10'],
            'country' => ['nullable', 'string', 'max:100'],
            'is_default' => ['boolean'],
        ]);

        if ($data['is_default'] ?? false) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create($data);

        return $this->created($address, 'Address added');
    }

    public function show(Request $request, UserAddress $address): JsonResponse
    {
        $this->authorizeAddress($request, $address);
        return $this->success($address);
    }

    public function update(Request $request, UserAddress $address): JsonResponse
    {
        $this->authorizeAddress($request, $address);

        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:50'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'address_line1' => ['sometimes', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:100'],
            'state' => ['sometimes', 'string', 'max:100'],
            'pincode' => ['sometimes', 'string', 'max:10'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $address->update($data);

        return $this->success($address, 'Address updated');
    }

    public function destroy(Request $request, UserAddress $address): JsonResponse
    {
        $this->authorizeAddress($request, $address);
        $address->delete();
        return $this->success(null, 'Address deleted');
    }

    public function setDefault(Request $request, UserAddress $address): JsonResponse
    {
        $this->authorizeAddress($request, $address);
        $request->user()->addresses()->update(['is_default' => false]);
        $address->update(['is_default' => true]);
        return $this->success($address, 'Default address set');
    }

    private function authorizeAddress(Request $request, UserAddress $address): void
    {
        if ($address->user_id !== $request->user()->id) {
            abort(403);
        }
    }
}
