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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('role')->default('customer')->after('phone'); // enum: customer/wholesale/admin
            $table->string('google_id')->nullable()->unique()->after('role');
            $table->string('avatar_url')->nullable()->after('google_id');
            $table->boolean('is_active')->default(true)->after('avatar_url');
            $table->string('password')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'role', 'google_id', 'avatar_url', 'is_active']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
