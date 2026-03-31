<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('name')->after('label');
            $table->string('phone', 20)->after('name');
            $table->renameColumn('address_line_1', 'address_line1');
            $table->renameColumn('address_line_2', 'address_line2');
            $table->renameColumn('postal_code', 'pincode');
        });
    }

    public function down(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->dropColumn(['name', 'phone']);
            $table->renameColumn('address_line1', 'address_line_1');
            $table->renameColumn('address_line2', 'address_line_2');
            $table->renameColumn('pincode', 'postal_code');
        });
    }
};
