<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value'];

    protected $casts = ['value' => 'json'];

    // ── Static helpers ────────────────────────────────────────────────────────

    public static function get(string $key, mixed $default = null, string $group = 'general'): mixed
    {
        return Cache::rememberForever("setting:{$group}:{$key}", function () use ($key, $group, $default) {
            $row = static::where('group', $group)->where('key', $key)->first();
            return $row ? $row->value : $default;
        });
    }

    public static function set(string $key, mixed $value, string $group = 'general'): void
    {
        static::updateOrCreate(
            ['group' => $group, 'key' => $key],
            ['value' => $value]
        );
        Cache::forget("setting:{$group}:{$key}");
    }

    /** Return all keys in a group as a flat associative array. */
    public static function allInGroup(string $group = 'general'): array
    {
        return static::where('group', $group)
            ->pluck('value', 'key')
            ->toArray();
    }

    // ── URL helpers ───────────────────────────────────────────────────────────

    public static function logoUrl(): ?string
    {
        $path = static::get('logo_path');
        return $path ? Storage::disk('s3')->url($path) : null;
    }

    public static function faviconUrl(): ?string
    {
        $path = static::get('favicon_path');
        return $path ? Storage::disk('s3')->url($path) : null;
    }
}
