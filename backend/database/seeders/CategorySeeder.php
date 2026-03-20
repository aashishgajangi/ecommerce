<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Cakes',
                'slug' => 'cakes',
                'description' => 'Custom cakes for every occasion',
                'is_active' => true,
                'sort_order' => 1,
                'children' => [
                    ['name' => 'Birthday Cakes',   'slug' => 'birthday-cakes',   'sort_order' => 1],
                    ['name' => 'Wedding Cakes',    'slug' => 'wedding-cakes',    'sort_order' => 2],
                    ['name' => 'Anniversary Cakes','slug' => 'anniversary-cakes','sort_order' => 3],
                    ['name' => 'Designer Cakes',   'slug' => 'designer-cakes',   'sort_order' => 4],
                    ['name' => 'Photo Cakes',      'slug' => 'photo-cakes',      'sort_order' => 5],
                ],
            ],
            [
                'name' => 'Cupcakes',
                'slug' => 'cupcakes',
                'description' => 'Freshly baked cupcakes',
                'is_active' => true,
                'sort_order' => 2,
                'children' => [
                    ['name' => 'Classic Cupcakes', 'slug' => 'classic-cupcakes', 'sort_order' => 1],
                    ['name' => 'Themed Cupcakes',  'slug' => 'themed-cupcakes',  'sort_order' => 2],
                ],
            ],
            [
                'name' => 'Pastries',
                'slug' => 'pastries',
                'description' => 'Freshly baked pastries',
                'is_active' => true,
                'sort_order' => 3,
                'children' => [
                    ['name' => 'Croissants',  'slug' => 'croissants',  'sort_order' => 1],
                    ['name' => 'Danish',      'slug' => 'danish',      'sort_order' => 2],
                    ['name' => 'Tarts',       'slug' => 'tarts',       'sort_order' => 3],
                ],
            ],
            [
                'name' => 'Desserts',
                'slug' => 'desserts',
                'description' => 'Indulgent desserts',
                'is_active' => true,
                'sort_order' => 4,
                'children' => [
                    ['name' => 'Cheesecakes',   'slug' => 'cheesecakes',    'sort_order' => 1],
                    ['name' => 'Brownies',      'slug' => 'brownies',       'sort_order' => 2],
                    ['name' => 'Cookies',       'slug' => 'cookies',        'sort_order' => 3],
                    ['name' => 'Macarons',      'slug' => 'macarons',       'sort_order' => 4],
                ],
            ],
            [
                'name' => 'Gifting',
                'slug' => 'gifting',
                'description' => 'Gift hampers and combos',
                'is_active' => true,
                'sort_order' => 5,
                'children' => [
                    ['name' => 'Gift Hampers', 'slug' => 'gift-hampers', 'sort_order' => 1],
                    ['name' => 'Combos',       'slug' => 'combos',       'sort_order' => 2],
                ],
            ],
        ];

        foreach ($categories as $data) {
            $children = $data['children'] ?? [];
            unset($data['children']);

            $parent = Category::updateOrCreate(
                ['slug' => $data['slug']],
                array_merge($data, ['is_active' => true])
            );

            foreach ($children as $child) {
                Category::updateOrCreate(
                    ['slug' => $child['slug']],
                    array_merge($child, [
                        'parent_id' => $parent->id,
                        'is_active' => true,
                        'description' => null,
                    ])
                );
            }
        }
    }
}
