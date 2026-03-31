<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── orders ─────────────────────────────────────────────────────────────
        Schema::table('orders', function (Blueprint $table) {
            // Rename address columns
            $table->renameColumn('shipping_address_json', 'shipping_address');
            $table->renameColumn('billing_address_json', 'billing_address');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('currency', 3)->default('INR')->after('total');
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete()->after('currency');
        });

        // ── order_items ────────────────────────────────────────────────────────
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->after('order_id');
            $table->renameColumn('variant_name', 'variant_label');
            $table->renameColumn('total_price', 'total');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->default(0)->after('unit_price');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('discount_amount');
        });

        // ── payments ───────────────────────────────────────────────────────────
        Schema::table('payments', function (Blueprint $table) {
            $table->string('method', 50)->nullable()->after('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->renameColumn('shipping_address', 'shipping_address_json');
            $table->renameColumn('billing_address', 'billing_address_json');
            $table->dropColumn(['currency', 'coupon_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['product_id', 'discount_amount', 'tax_amount']);
            $table->renameColumn('variant_label', 'variant_name');
            $table->renameColumn('total', 'total_price');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('method');
        });
    }
};
