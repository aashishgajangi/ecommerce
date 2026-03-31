<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends ApiController
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        $frontendUrl = env('FRONTEND_URL', 'https://order.hangoutcakes.com');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect($frontendUrl . '/auth/login?error=google_failed');
        }

        $user = User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName(),
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'role' => UserRole::Customer,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        if (! $user->google_id) {
            $user->update([
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
            ]);
        }

        if (! $user->is_active) {
            return redirect($frontendUrl . '/auth/login?error=deactivated');
        }

        $token = $user->createToken('google-oauth')->plainTextToken;

        $params = http_build_query([
            'token' => $token,
            'user'  => json_encode((new UserResource($user))->resolve()),
        ]);

        return redirect($frontendUrl . '/auth/callback?' . $params);
    }
}
