<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\TaxRate;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $hangoutBrand  = Brand::where('slug', 'hangout-cakes')->first();
        $sweetBrand    = Brand::where('slug', 'the-sweet-studio')->first();

        $birthdayCat   = Category::where('slug', 'birthday-cakes')->first();
        $weddingCat    = Category::where('slug', 'wedding-cakes')->first();
        $designerCat   = Category::where('slug', 'designer-cakes')->first();
        $cupcakeCat    = Category::where('slug', 'classic-cupcakes')->first();
        $brownieCat    = Category::where('slug', 'brownies')->first();
        $cheesecakeCat = Category::where('slug', 'cheesecakes')->first();

        $gst5  = TaxRate::where('name', 'GST 5%')->first();
        $gst12 = TaxRate::where('name', 'GST 12%')->first();
        $gst18 = TaxRate::where('name', 'GST 18%')->first();

        $products = [
            [
                'product' => [
                    'brand_id'          => $hangoutBrand?->id,
                    'name'              => 'Classic Chocolate Birthday Cake',
                    'slug'              => 'classic-chocolate-birthday-cake',
                    'description'       => 'Rich, moist chocolate layers filled with Belgian chocolate ganache, topped with smooth chocolate buttercream. A timeless favourite for any birthday celebration.',
                    'short_description' => 'Rich Belgian chocolate layers with ganache filling',
                    'base_price'        => 699.00,
                    'wholesale_price'   => 560.00,
                    'min_wholesale_qty' => 5,
                    'sku_prefix'        => 'CHOC-BDAY',
                    'weight'            => 1.00,
                    'is_active'         => true,
                    'is_featured'       => true,
                    'meta_title'        => 'Classic Chocolate Birthday Cake | Hangout Cakes',
                    'meta_description'  => 'Order rich chocolate birthday cakes online. Belgian ganache, fresh delivery.',
                ],
                'categories' => [$birthdayCat?->id, $designerCat?->id],
                'tax_rate'   => $gst5,
                'variants'   => [
                    ['sku' => 'CHOC-BDAY-500G', 'price' => 699.00,  'weight' => 0.5, 'stock' => 20],
                    ['sku' => 'CHOC-BDAY-1KG',  'price' => 1199.00, 'weight' => 1.0, 'stock' => 15],
                    ['sku' => 'CHOC-BDAY-2KG',  'price' => 2099.00, 'weight' => 2.0, 'stock' => 10],
                ],
            ],
            [
                'product' => [
                    'brand_id'          => $hangoutBrand?->id,
                    'name'              => 'Strawberry Vanilla Dream Cake',
                    'slug'              => 'strawberry-vanilla-dream-cake',
                    'description'       => 'Light vanilla sponge layered with fresh strawberry compote and whipped cream. Topped with seasonal strawberries — perfect for summer celebrations.',
                    'short_description' => 'Light vanilla sponge with fresh strawberry compote',
                    'base_price'        => 749.00,
                    'wholesale_price'   => 599.00,
                    'min_wholesale_qty' => 5,
                    'sku_prefix'        => 'STRAW-VAN',
                    'weight'            => 1.00,
                    'is_active'         => true,
                    'is_featured'       => true,
                    'meta_title'        => 'Strawberry Vanilla Cake | Hangout Cakes',
                    'meta_description'  => 'Fresh strawberry vanilla layer cake. Order online for same-day delivery.',
                ],
                'categories' => [$birthdayCat?->id],
                'tax_rate'   => $gst5,
                'variants'   => [
                    ['sku' => 'STRAW-VAN-500G', 'price' => 749.00,  'weight' => 0.5, 'stock' => 18],
                    ['sku' => 'STRAW-VAN-1KG',  'price' => 1299.00, 'weight' => 1.0, 'stock' => 12],
                ],
            ],
            [
                'product' => [
                    'brand_id'          => $hangoutBrand?->id,
                    'name'              => 'Red Velvet Wedding Cake (3-Tier)',
                    'slug'              => 'red-velvet-wedding-cake-3-tier',
                    'description'       => 'A stunning 3-tier red velvet cake with cream cheese frosting, edible flowers, and custom fondant decorations. Made to order for your special day.',
                    'short_description' => '3-tier red velvet with cream cheese frosting — made to order',
                    'base_price'        => 4999.00,
                    'wholesale_price'   => 3999.00,
                    'min_wholesale_qty' => 2,
                    'sku_prefix'        => 'RV-WEDDING',
                    'weight'            => 5.00,
                    'is_active'         => true,
                    'is_featured'       => true,
                    'meta_title'        => 'Red Velvet Wedding Cake | Hangout Cakes',
                    'meta_description'  => 'Custom 3-tier red velvet wedding cakes. Order 7 days in advance.',
                ],
                'categories' => [$weddingCat?->id],
                'tax_rate'   => $gst12,
                'variants'   => [
                    ['sku' => 'RV-WEDDING-3TIER', 'price' => 4999.00, 'weight' => 5.0, 'stock' => 5],
                    ['sku' => 'RV-WEDDING-4TIER', 'price' => 7499.00, 'weight' => 7.0, 'stock' => 3],
                ],
            ],
            [
                'product' => [
                    'brand_id'          => $hangoutBrand?->id,
                    'name'              => 'Assorted Cupcakes Box',
                    'slug'              => 'assorted-cupcakes-box',
                    'description'       => 'A delightful box of freshly baked cupcakes in assorted flavours — chocolate, vanilla, red velvet, and lemon. Perfect for gifting or parties.',
                    'short_description' => 'Freshly baked assorted flavour cupcakes',
                    'base_price'        => 399.00,
                    'wholesale_price'   => 299.00,
                    'min_wholesale_qty' => 10,
                    'sku_prefix'        => 'CUP-ASST',
                    'weight'            => 0.60,
                    'is_active'         => true,
                    'is_featured'       => false,
                    'meta_title'        => 'Assorted Cupcakes Box | Hangout Cakes',
                    'meta_description'  => 'Order assorted cupcake boxes online. Fresh daily.',
                ],
                'categories' => [$cupcakeCat?->id],
                'tax_rate'   => $gst5,
                'variants'   => [
                    ['sku' => 'CUP-ASST-6PC',  'price' => 399.00, 'weight' => 0.6,  'stock' => 30],
                    ['sku' => 'CUP-ASST-12PC', 'price' => 699.00, 'weight' => 1.2,  'stock' => 25],
                    ['sku' => 'CUP-ASST-24PC', 'price' => 1299.00,'weight' => 2.4,  'stock' => 15],
                ],
            ],
            [
                'product' => [
                    'brand_id'          => $sweetBrand?->id,
                    'name'              => 'New York Cheesecake',
                    'slug'              => 'new-york-cheesecake',
                    'description'       => 'Dense, creamy New York-style cheesecake on a buttery graham cracker crust. Available plain or with berry compote topping.',
                    'short_description' => 'Dense, creamy New York-style cheesecake',
                    'base_price'        => 599.00,
                    'wholesale_price'   => 479.00,
                    'min_wholesale_qty' => 5,
                    'sku_prefix'        => 'NY-CHEESE',
                    'weight'            => 0.80,
                    'is_active'         => true,
                    'is_featured'       => true,
                    'meta_title'        => 'New York Cheesecake | The Sweet Studio',
                    'meta_description'  => 'Authentic New York cheesecake. Order online for next-day delivery.',
                ],
                'categories' => [$cheesecakeCat?->id],
                'tax_rate'   => $gst18,
                'variants'   => [
                    ['sku' => 'NY-CHEESE-PLAIN',  'price' => 599.00, 'weight' => 0.8, 'stock' => 20],
                    ['sku' => 'NY-CHEESE-BERRY',  'price' => 649.00, 'weight' => 0.8, 'stock' => 15],
                    ['sku' => 'NY-CHEESE-MANGO',  'price' => 649.00, 'weight' => 0.8, 'stock' => 15],
                ],
            ],
            [
                'product' => [
                    'brand_id'          => $hangoutBrand?->id,
                    'name'              => 'Fudge Brownies (Box)',
                    'slug'              => 'fudge-brownies-box',
                    'description'       => 'Ultra-fudgy, dense chocolate brownies made with real Belgian chocolate. Each box comes with individually wrapped brownies.',
                    'short_description' => 'Ultra-fudgy Belgian chocolate brownies',
                    'base_price'        => 299.00,
                    'wholesale_price'   => 229.00,
                    'min_wholesale_qty' => 10,
                    'sku_prefix'        => 'FUDGE-BRN',
                    'weight'            => 0.40,
                    'is_active'         => true,
                    'is_featured'       => false,
                    'meta_title'        => 'Fudge Brownies Box | Hangout Cakes',
                    'meta_description'  => 'Rich Belgian chocolate fudge brownies. Order online.',
                ],
                'categories' => [$brownieCat?->id],
                'tax_rate'   => $gst5,
                'variants'   => [
                    ['sku' => 'FUDGE-BRN-6PC',  'price' => 299.00, 'weight' => 0.4, 'stock' => 40],
                    ['sku' => 'FUDGE-BRN-12PC', 'price' => 549.00, 'weight' => 0.8, 'stock' => 30],
                ],
            ],
        ];

        foreach ($products as $entry) {
            $productData = $entry['product'];

            // Attach tax rate if model supports it
            if ($entry['tax_rate']) {
                $productData['tax_rate_id'] = $entry['tax_rate']->id;
            }

            $product = Product::updateOrCreate(
                ['slug' => $productData['slug']],
                $productData
            );

            // Sync categories
            $catIds = array_filter($entry['categories'] ?? []);
            if ($catIds) {
                $product->categories()->sync($catIds);
            }

            // Variants + inventory
            foreach ($entry['variants'] as $v) {
                $variant = ProductVariant::updateOrCreate(
                    ['sku' => $v['sku']],
                    [
                        'product_id'      => $product->id,
                        'sku'             => $v['sku'],
                        'price'           => $v['price'],
                        'wholesale_price' => round($v['price'] * 0.80, 2),
                        'weight'          => $v['weight'],
                        'is_active'       => true,
                    ]
                );

                Inventory::updateOrCreate(
                    ['variant_id' => $variant->id],
                    [
                        'quantity'            => $v['stock'],
                        'reserved_quantity'   => 0,
                        'low_stock_threshold' => 5,
                    ]
                );
            }
        }
    }
}
