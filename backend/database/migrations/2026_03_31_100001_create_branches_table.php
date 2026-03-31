<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('state');
            $table->string('pincode', 10);
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('service_radius_km', 5, 2)->default(10.00);
            $table->decimal('delivery_base_fee', 8, 2)->default(0.00);
            $table->decimal('delivery_per_km_fee', 8, 2)->default(0.00);
            $table->decimal('free_delivery_above', 8, 2)->nullable();
            $table->time('opening_time')->default('09:00:00');
            $table->time('closing_time')->default('21:00:00');
            $table->json('days_open')->default('["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]');
            $table->string('google_place_id')->nullable();
            $table->string('google_maps_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
