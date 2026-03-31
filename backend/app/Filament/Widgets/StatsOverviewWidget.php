<?php

namespace App\Filament\Widgets;

use App\Enums\OrderStatus;
use App\Models\Order;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 0;

    protected function getStats(): array
    {
        $todayOrders   = Order::whereDate('created_at', today())->count();
        $pendingOrders = Order::where('status', OrderStatus::Pending)->count();
        $monthRevenue  = Order::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->whereNotIn('status', [OrderStatus::Cancelled, OrderStatus::Refunded])
            ->sum('total');

        return [
            Stat::make('Orders Today', $todayOrders)
                ->icon('heroicon-o-shopping-cart')
                ->color('primary'),

            Stat::make('Pending Orders', $pendingOrders)
                ->description($pendingOrders > 0 ? 'Needs attention' : 'All clear')
                ->icon('heroicon-o-clock')
                ->color($pendingOrders > 0 ? 'warning' : 'success'),

            Stat::make('Revenue This Month', '₹' . number_format((float) $monthRevenue))
                ->icon('heroicon-o-banknotes')
                ->color('success'),
        ];
    }
}
