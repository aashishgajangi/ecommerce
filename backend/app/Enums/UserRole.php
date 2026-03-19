<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Wholesale = 'wholesale';
    case Admin = 'admin';

    public function label(): string
    {
        return match($this) {
            UserRole::Customer => 'Customer',
            UserRole::Wholesale => 'Wholesale',
            UserRole::Admin => 'Admin',
        };
    }

    public function isAdmin(): bool
    {
        return $this === UserRole::Admin;
    }

    public function isWholesale(): bool
    {
        return $this === UserRole::Wholesale;
    }
}
