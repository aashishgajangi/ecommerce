<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'gateway')) {
                $table->string('gateway')->nullable()->after('order_id');
            }
            if (! Schema::hasColumn('payments', 'gateway_order_id')) {
                $table->string('gateway_order_id')->nullable()->after('gateway');
            }
            if (! Schema::hasColumn('payments', 'gateway_payment_id')) {
                $table->string('gateway_payment_id')->nullable()->after('gateway_order_id');
            }
            if (! Schema::hasColumn('payments', 'gateway_response')) {
                $table->jsonb('gateway_response')->nullable()->after('gateway_payment_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumnIfExists('gateway');
            $table->dropColumnIfExists('gateway_order_id');
            $table->dropColumnIfExists('gateway_payment_id');
            $table->dropColumnIfExists('gateway_response');
        });
    }
};
