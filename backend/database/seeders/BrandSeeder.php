<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            ['name' => 'Hangout Cakes',    'slug' => 'hangout-cakes',    'is_active' => true],
            ['name' => 'The Sweet Studio', 'slug' => 'the-sweet-studio', 'is_active' => true],
            ['name' => 'Bakehouse Co.',    'slug' => 'bakehouse-co',     'is_active' => true],
        ];

        foreach ($brands as $brand) {
            Brand::updateOrCreate(['slug' => $brand['slug']], $brand);
        }
    }
}
