<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('shipping_zones')->cascadeOnDelete();
            $table->string('method_name');
            $table->decimal('min_weight', 8, 3)->default(0);
            $table->decimal('max_weight', 8, 3)->nullable();
            $table->decimal('min_order_total', 10, 2)->default(0);
            $table->decimal('price', 10, 2);
            $table->decimal('is_free_above', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipping_rates');
    }
};
