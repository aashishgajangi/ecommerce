<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BranchResource\Pages;
use App\Models\Branch;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BranchResource extends Resource
{
    protected static ?string $model = Branch::class;
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-map-pin';
    protected static string|\UnitEnum|null $navigationGroup = 'Locations';
    protected static ?int $navigationSort = 1;

    // ── Google Places Import Action ──────────────────────────────────────────
    public static function googleImportAction(): Action
    {
        return Action::make('importFromGoogle')
            ->label('Import from Google Maps')
            ->icon('heroicon-o-magnifying-glass')
            ->color('info')
            ->modalHeading('Search Google Maps')
            ->modalDescription('Search for your business location on Google Maps to auto-fill all branch details.')
            ->modalWidth('lg')
            ->form([
                Forms\Components\Select::make('place_id')
                    ->label('Search your business on Google Maps')
                    ->placeholder('Type business name or address… (min 3 chars)')
                    ->searchable()
                    ->required()
                    ->getSearchResultsUsing(function (string $search): array {
                        $key = config('services.google_maps.key');
                        if (! $key || strlen(trim($search)) < 3) {
                            return [];
                        }

                        try {
                            $res = Http::timeout(5)->get(
                                'https://maps.googleapis.com/maps/api/place/textsearch/json',
                                ['query' => $search, 'key' => $key, 'region' => 'in']
                            );
                            return collect($res->json('results', []))
                                ->take(8)
                                ->mapWithKeys(fn ($p) => [
                                    $p['place_id'] => $p['name'] . '  ·  ' . ($p['formatted_address'] ?? ''),
                                ])
                                ->toArray();
                        } catch (\Throwable) {
                            return [];
                        }
                    })
                    ->getOptionLabelUsing(fn ($value) => $value),
            ])
            ->action(function (array $data, $livewire): void {
                $key = config('services.google_maps.key');
                if (! $key) {
                    Notification::make()->title('Google Maps key not configured')->danger()->send();
                    return;
                }

                try {
                    $res = Http::timeout(5)->get(
                        'https://maps.googleapis.com/maps/api/place/details/json',
                        [
                            'place_id' => $data['place_id'],
                            'fields'   => implode(',', [
                                'name',
                                'formatted_address',
                                'address_components',
                                'geometry',
                                'international_phone_number',
                                'formatted_phone_number',
                                'url',
                                'opening_hours',
                                'place_id',
                            ]),
                            'key' => $key,
                        ]
                    );

                    $place = $res->json('result', []);
                    if (empty($place)) {
                        Notification::make()->title('No details found for this place')->warning()->send();
                        return;
                    }

                    // ── Parse address components ─────────────────────────
                    $comps  = collect($place['address_components'] ?? []);
                    $get    = fn (string $type) => $comps
                        ->first(fn ($c) => in_array($type, $c['types']))['long_name'] ?? '';

                    $streetNo   = $get('street_number');
                    $route      = $get('route');
                    $sublocality = $get('sublocality_level_1') ?: $get('sublocality') ?: $get('neighborhood');
                    $locality   = $get('locality') ?: $get('administrative_area_level_2');
                    $adminL1    = $get('administrative_area_level_1');
                    $postal     = $get('postal_code');

                    $addrLine1 = trim(implode(' ', array_filter([$streetNo, $route])));
                    if (! $addrLine1) $addrLine1 = $sublocality;
                    if (! $addrLine1) $addrLine1 = explode(',', $place['formatted_address'] ?? '')[0] ?? '';

                    $name = $place['name'] ?? '';

                    // ── Opening hours ────────────────────────────────────
                    $openingTime = '09:00';
                    $closingTime = '21:00';
                    $daysOpen    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                    if (! empty($place['opening_hours']['periods'])) {
                        $periods = $place['opening_hours']['periods'];

                        // Use the first period for open/close time
                        $first = $periods[0] ?? null;
                        if ($first) {
                            $ot = $first['open']['time']  ?? '0900';
                            $ct = $first['close']['time'] ?? '2100';
                            $openingTime = substr($ot, 0, 2) . ':' . substr($ot, 2, 2);
                            $closingTime = substr($ct, 0, 2) . ':' . substr($ct, 2, 2);
                        }

                        $dayMap  = [0 => 'Sun', 1 => 'Mon', 2 => 'Tue', 3 => 'Wed', 4 => 'Thu', 5 => 'Fri', 6 => 'Sat'];
                        $daysOpen = collect($periods)
                            ->pluck('open.day')
                            ->unique()
                            ->map(fn ($d) => $dayMap[$d] ?? null)
                            ->filter()
                            ->values()
                            ->toArray();
                    }

                    // ── Phone ────────────────────────────────────────────
                    $phone = $place['international_phone_number']
                        ?? $place['formatted_phone_number']
                        ?? '';

                    // ── Fill the Livewire form ────────────────────────────
                    $current = $livewire->form->getState();
                    $livewire->form->fill(array_merge($current, [
                        'name'            => $name,
                        'slug'            => Str::slug($name),
                        'address_line1'   => $addrLine1,
                        'address_line2'   => $sublocality && $sublocality !== $addrLine1 ? $sublocality : ($current['address_line2'] ?? ''),
                        'city'            => $locality,
                        'state'           => $adminL1,
                        'pincode'         => $postal,
                        'lat'             => $place['geometry']['location']['lat'] ?? null,
                        'lng'             => $place['geometry']['location']['lng'] ?? null,
                        'phone'           => $phone,
                        'google_place_id' => $place['place_id'] ?? $data['place_id'],
                        'google_maps_url' => $place['url'] ?? '',
                        'opening_time'    => $openingTime,
                        'closing_time'    => $closingTime,
                        'days_open'       => $daysOpen,
                    ]));

                    Notification::make()
                        ->title("Imported: {$name}")
                        ->body('Review the auto-filled details and save when ready.')
                        ->success()
                        ->send();

                } catch (\Throwable $e) {
                    Notification::make()
                        ->title('Google Maps import failed')
                        ->body($e->getMessage())
                        ->danger()
                        ->send();
                }
            });
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Branch Details')->columns(2)->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn ($state, callable $set) => $set('slug', Str::slug($state))),

                Forms\Components\TextInput::make('slug')
                    ->required()
                    ->unique(Branch::class, 'slug', ignoreRecord: true)
                    ->maxLength(255),

                Forms\Components\TextInput::make('phone')->tel()->maxLength(20),
                Forms\Components\TextInput::make('email')->email()->maxLength(255),
            ]),

            Section::make('Address')->columns(2)->schema([
                Forms\Components\TextInput::make('address_line1')->required()->maxLength(255)->columnSpanFull(),
                Forms\Components\TextInput::make('address_line2')->maxLength(255)->columnSpanFull(),
                Forms\Components\TextInput::make('city')->required()->maxLength(100),
                Forms\Components\TextInput::make('state')->required()->maxLength(100),
                Forms\Components\TextInput::make('pincode')->required()->maxLength(10),
            ]),

            Section::make('Map Coordinates')->columns(2)->schema([
                Forms\Components\TextInput::make('lat')
                    ->label('Latitude')
                    ->numeric()
                    ->step(0.00000001)
                    ->helperText('Auto-filled when you import from Google Maps or save with a valid address.'),
                Forms\Components\TextInput::make('lng')
                    ->label('Longitude')
                    ->numeric()
                    ->step(0.00000001),
                Forms\Components\TextInput::make('google_place_id')
                    ->label('Google Place ID')
                    ->maxLength(255),
                Forms\Components\TextInput::make('google_maps_url')
                    ->label('Google Maps URL')
                    ->url()
                    ->maxLength(500),
            ]),

            Section::make('Delivery Settings')->columns(2)->schema([
                Forms\Components\TextInput::make('service_radius_km')
                    ->label('Service Radius (km)')
                    ->required()
                    ->numeric()
                    ->default(10)
                    ->minValue(0),
                Forms\Components\TextInput::make('delivery_base_fee')
                    ->label('Base Delivery Fee (₹)')
                    ->required()
                    ->numeric()
                    ->default(0)
                    ->minValue(0),
                Forms\Components\TextInput::make('delivery_per_km_fee')
                    ->label('Per km Fee (₹)')
                    ->required()
                    ->numeric()
                    ->default(0)
                    ->minValue(0),
                Forms\Components\TextInput::make('free_delivery_above')
                    ->label('Free Delivery Above Order Total (₹)')
                    ->numeric()
                    ->minValue(0)
                    ->placeholder('Leave blank to disable'),
            ]),

            Section::make('Operating Hours')->columns(2)->schema([
                Forms\Components\TimePicker::make('opening_time')
                    ->required()
                    ->default('09:00'),
                Forms\Components\TimePicker::make('closing_time')
                    ->required()
                    ->default('21:00'),
                Forms\Components\CheckboxList::make('days_open')
                    ->label('Open Days')
                    ->options([
                        'Mon' => 'Monday',
                        'Tue' => 'Tuesday',
                        'Wed' => 'Wednesday',
                        'Thu' => 'Thursday',
                        'Fri' => 'Friday',
                        'Sat' => 'Saturday',
                        'Sun' => 'Sunday',
                    ])
                    ->columns(4)
                    ->default(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])
                    ->columnSpanFull(),
            ]),

            Section::make('Visibility')->columns(2)->schema([
                Forms\Components\Toggle::make('is_active')
                    ->label('Active')
                    ->default(true),
                Forms\Components\TextInput::make('sort_order')
                    ->numeric()
                    ->default(0),
            ]),
        ]);
    }

    // ── Table ─────────────────────────────────────────────────────────────────
    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('city')->sortable(),
                Tables\Columns\TextColumn::make('service_radius_km')->label('Radius (km)')->sortable(),
                Tables\Columns\TextColumn::make('delivery_base_fee')->label('Base Fee')->money('INR')->sortable(),
                Tables\Columns\TextColumn::make('opening_time')->label('Opens'),
                Tables\Columns\TextColumn::make('closing_time')->label('Closes'),
                Tables\Columns\IconColumn::make('is_active')->boolean()->label('Active'),
                Tables\Columns\TextColumn::make('sort_order')->sortable(),
            ])
            ->defaultSort('sort_order')
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')->label('Active'),
            ])
            ->actions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListBranches::route('/'),
            'create' => Pages\CreateBranch::route('/create'),
            'edit'   => Pages\EditBranch::route('/{record}/edit'),
        ];
    }
}
