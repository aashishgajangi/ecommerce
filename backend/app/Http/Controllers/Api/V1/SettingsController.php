<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json([
            'site_name'      => Setting::get('site_name', 'Hangout Cakes'),
            'site_tagline'   => Setting::get('site_tagline'),
            'logo_url'       => Setting::logoUrl(),
            'favicon_url'    => Setting::faviconUrl(),
            'contact_email'  => Setting::get('contact_email'),
            'contact_phone'  => Setting::get('contact_phone'),
            'address'        => Setting::get('address'),
            'facebook_url'   => Setting::get('facebook_url'),
            'instagram_url'  => Setting::get('instagram_url'),
            'twitter_url'    => Setting::get('twitter_url'),
            'notice_enabled' => (bool) Setting::get('notice_enabled', false),
            'notice_text'    => Setting::get('notice_text'),
        ]);
    }
}
