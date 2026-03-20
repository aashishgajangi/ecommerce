<?php

namespace Database\Seeders;

use App\Models\TaxRate;
use Illuminate\Database\Seeder;

class TaxRateSeeder extends Seeder
{
    public function run(): void
    {
        $rates = [
            ['name' => 'GST 0%',  'rate' => 0.00,  'hsn_code' => null,   'is_default' => false, 'is_active' => true],
            ['name' => 'GST 5%',  'rate' => 5.00,  'hsn_code' => '1905', 'is_default' => true,  'is_active' => true],
            ['name' => 'GST 12%', 'rate' => 12.00, 'hsn_code' => '2106', 'is_default' => false, 'is_active' => true],
            ['name' => 'GST 18%', 'rate' => 18.00, 'hsn_code' => '2105', 'is_default' => false, 'is_active' => true],
            ['name' => 'GST 28%', 'rate' => 28.00, 'hsn_code' => null,   'is_default' => false, 'is_active' => true],
        ];

        foreach ($rates as $rate) {
            TaxRate::updateOrCreate(['name' => $rate['name']], $rate);
        }
    }
}
