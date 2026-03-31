<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $frontend = rtrim(config('app.frontend_url'), '/');

        // Password reset link → frontend page
        ResetPassword::createUrlUsing(function ($user, string $token) use ($frontend) {
            return $frontend . '/auth/reset-password?token=' . $token
                . '&email=' . urlencode($user->getEmailForPasswordReset());
        });

        // Email verification link → frontend page
        VerifyEmail::createUrlUsing(function ($notifiable) use ($frontend) {
            return $frontend . '/auth/verify-email'
                . '?id='   . $notifiable->getKey()
                . '&hash=' . sha1($notifiable->getEmailForVerification());
        });
    }
}
