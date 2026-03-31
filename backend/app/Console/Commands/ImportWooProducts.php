<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportWooProducts extends Command
{
    protected $signature   = 'app:import-woo-products {--fresh : Delete previously imported WooCommerce products first}';
    protected $description = 'Import products from WooCommerce CSV export into the database with images uploaded to MinIO';

    private array $data = [
        [
            'name'  => 'Gluten-free & Sugar-free Chocolate Bento',
            'price' => 450.00,
            'cats'  => ['Bento Cakes', 'Guilt-free'],
            'short' => 'Gluten free and sugar free chocolate bento cake made with almond flour and jaggery-based chocolate ganache. 60% no added sugar.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/GLUTENFREE-SUGARFREE-CHOCOLATE-BENTO-CAKE--scaled.jpg',
        ],
        [
            'name'  => 'Red Velvet Bento Cake',
            'price' => 380.00,
            'cats'  => ['Bento Cakes', 'Signature Bento Cakes'],
            'short' => 'Soft, fluffy red velvet sponge layered with smooth cream cheese frosting in a 300g bento cake. Perfect for birthdays and anniversaries.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/Untitled-design-1-1.png',
        ],
        [
            'name'  => 'Lotus Biscoff Bento Cake',
            'price' => 380.00,
            'cats'  => ['Bento Cakes', 'Signature Bento Cakes'],
            'short' => 'Creamy, caramel-rich Lotus Biscoff Bento Cake layered with moist sponge, Biscoff spread, and crumbs. 300g of pure indulgence.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/Untitled-design-3-1.png',
        ],
        [
            'name'  => 'Lotus Biscoff Baked Cheesecake Bento',
            'price' => 450.00,
            'cats'  => ['Bento Cakes', 'Cheesecake Bento'],
            'short' => 'Slow-baked cheesecake with Madagascan vanilla base, Lotus Biscoff layers and Biscoff spread topping. Ideal for 3–4 adults.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/lotus-biscoff-baked-cheese-bento-cake.jpg',
        ],
        [
            'name'  => 'KitKat Baked Cheesecake Bento',
            'price' => 450.00,
            'cats'  => ['Bento Cakes', 'Cheesecake Bento'],
            'short' => 'Rich baked cheesecake with KitKat chunks folded in and on top, finished with Nutella spread. Simple yet utterly delicious.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/kitkat-baked-cheese-bento-cake-scaled.jpg',
        ],
        [
            'name'  => 'Bento Dark Cherry Chocolate Cake',
            'price' => 380.00,
            'cats'  => ['Bento Cakes', 'Signature Bento Cakes'],
            'short' => 'Dark pitted cherries soaked in sugar syrup layered with fudge and cherry-soaked chocolate sponge. A classic flavour in a 300g bento.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/Untitled-design-2.png',
        ],
        [
            'name'  => 'Dutch Truffle Bento Cake',
            'price' => 380.00,
            'cats'  => ['Bento Cakes', 'Signature Bento Cakes'],
            'short' => 'Soft chocolate sponge generously coated with smooth Dutch truffle ganache in a 300g bento. Pure chocolate bliss.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/dutch-truffle-bento-cake.png',
        ],
        [
            'name'  => 'Chocolate Orange Bento Cake',
            'price' => 475.00,
            'cats'  => ['Bento Cakes', 'Signature Bento Cakes'],
            'short' => 'Two layers of fluffy chocolate sponge with tangy orange whip, chocolate ganache and fresh orange slices. A zesty classic in 300g.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/11/chocolate-orange-bento-cake.jpeg',
        ],
        [
            'name'  => 'Blueberry Baked Cheesecake Bento',
            'price' => 450.00,
            'cats'  => ['Bento Cakes', 'Cheesecake Bento'],
            'short' => 'Slow-baked creamy cheesecake topped with real blueberry compote. A classic, indulgent 300g dessert.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/11/blueberry-baked-cheesecake-bento.png',
        ],
        [
            'name'  => 'Basque Chocolate Cheesecake Bento',
            'price' => 500.00,
            'cats'  => ['Bento Cakes', 'Cheesecake Bento'],
            'short' => 'Crustless Basque-style baked cheesecake with a caramelised top and rich chocolate cream cheese centre. Bold and premium.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/11/basque-chocolate-cheesecake-bento.jpeg',
        ],
        [
            'name'  => 'Hazelnut Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Chocolate sponge with a smooth chocolate hazelnut spread centre and rich hazelnut chocolate frosting on top.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/hazelnut-cupcake.webp',
        ],
        [
            'name'  => 'Red Velvet Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Moist red velvet sponge topped with signature silky cream cheese buttercream. A best-seller loved by true red velvet fans.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/red-velvet-cupcake.jpg',
        ],
        [
            'name'  => 'Blueberry Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Light sponge packed with blueberry filling topped with naturally coloured blueberry buttercream. All-natural colour and flavour.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/blueberry-cupcake.jpg',
        ],
        [
            'name'  => 'Oreo Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Chocolate sponge with chocolate ganache centre, Oreo frosting, an Oreo cookie on top and chocolate drizzle.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/oreo-cupcake.jpg',
        ],
        [
            'name'  => 'Gooey Chocolate Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Fluffy chocolate sponge with light chocolate ganache frosting. A must for chocolate lovers — pure comfort in every bite.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/gooey-chocolate-cupcake.jpg',
        ],
        [
            'name'  => 'Vanilla Chips Cupcake',
            'price' => 60.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Soft and moist vanilla sponge topped with a creamy swirl of vanilla and chocolate frosting. A timeless classic.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/10/vanilla-chips-cupcake.jpg',
        ],
        [
            'name'  => 'Pistachio Cupcake',
            'price' => 75.00,
            'cats'  => ['Cupcakes'],
            'short' => 'Soft vanilla sponge topped with luscious French cream, crushed pistachios and fragrant rose petals. Nutty, floral, luxurious.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2025/03/pistachio-cup-cake.png',
        ],
        [
            'name'  => 'Customised Bento Cake',
            'price' => 380.00,
            'cats'  => ['Bento Cakes', 'Customized Bento Cakes'],
            'short' => 'Design your own bento cake! Choose from Dutch Truffle, Pineapple, Raspberry, Strawberry or Truffle Torte flavours.',
            'image' => 'https://hangoutcakes.com/wp-content/uploads/2024/12/Untitled-design-4.png',
        ],
    ];

    public function handle(): int
    {
        // Optional: remove previously imported products
        if ($this->option('fresh')) {
            $this->warn('Deleting previously imported WooCommerce products...');
            Product::where('meta_source', 'woocommerce')->each(function (Product $p) {
                $p->images()->each(fn ($img) => Storage::disk('s3')->delete($img->path));
                $p->images()->delete();
                $p->categories()->detach();
                $p->delete();
            });
            $this->info('Done.');
        }

        $brand = Brand::where('name', 'Hangout Cakes')->first();
        if (! $brand) {
            $this->error('Brand "Hangout Cakes" not found. Run the brand seeder first.');
            return 1;
        }

        // Ensure categories exist
        $categoryMap = $this->ensureCategories();

        $imported = 0;
        $skipped  = 0;

        foreach ($this->data as $row) {
            $slug = Str::slug($row['name']);

            if (Product::where('slug', $slug)->exists()) {
                $this->line("  <fg=yellow>SKIP</> {$row['name']} (already exists)");
                $skipped++;
                continue;
            }

            // Download & upload image
            $imagePath = $this->uploadImage($row['image'], $row['name']);

            // Create product
            $product = Product::create([
                'name'              => $row['name'],
                'slug'              => $slug,
                'short_description' => $row['short'],
                'base_price'        => $row['price'],
                'brand_id'          => $brand->id,
                'is_active'         => true,
                'is_featured'       => false,
                'meta_source'       => 'woocommerce',
            ]);

            // Attach categories
            $catIds = collect($row['cats'])
                ->map(fn ($name) => $categoryMap[$name] ?? null)
                ->filter()
                ->values()
                ->toArray();
            $product->categories()->sync($catIds);

            // Create image record
            if ($imagePath) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'path'       => $imagePath,
                    'is_primary' => true,
                    'sort_order' => 0,
                ]);
            }

            $this->line("  <fg=green>OK</>    {$row['name']} (₹{$row['price']}" . ($imagePath ? ', image ✓' : ', no image') . ')');
            $imported++;
        }

        $this->newLine();
        $this->info("Done — {$imported} imported, {$skipped} skipped.");
        return 0;
    }

    private function ensureCategories(): array
    {
        $needed = [
            'Bento Cakes'           => null,
            'Signature Bento Cakes' => 'Bento Cakes',
            'Cheesecake Bento'      => 'Bento Cakes',
            'Customized Bento Cakes'=> 'Bento Cakes',
            'Guilt-free'            => null,
            'Cupcakes'              => null,
        ];

        $map = [];

        foreach ($needed as $name => $parentName) {
            $parentId = $parentName ? ($map[$parentName] ?? null) : null;

            $cat = Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name'      => $name,
                    'is_active' => true,
                    'sort_order'=> 0,
                    'parent_id' => $parentId,
                ]
            );

            $map[$name] = $cat->id;
        }

        // Also add existing "Cupcakes" category ID if it exists
        $existing = Category::whereIn('name', array_keys($map))->get();
        foreach ($existing as $cat) {
            $map[$cat->name] = $cat->id;
        }

        return $map;
    }

    private function uploadImage(string $url, string $productName): ?string
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get($url);

            if (! $response->successful()) {
                $this->warn("  Image download failed ({$response->status()}): {$url}");
                return null;
            }

            $ext      = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION)) ?: 'jpg';
            $ext      = in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif']) ? $ext : 'jpg';
            $filename = (string) Str::ulid() . '.' . $ext;

            Storage::disk('s3')->put($filename, $response->body(), 'public');

            return $filename;
        } catch (\Throwable $e) {
            $this->warn("  Image error for '{$productName}': " . $e->getMessage());
            return null;
        }
    }
}
