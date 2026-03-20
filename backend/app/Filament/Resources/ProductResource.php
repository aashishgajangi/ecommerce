<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\TaxRate;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-shopping-bag';
    protected static string|\UnitEnum|null $navigationGroup = 'Catalog';
    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Tabs::make()->tabs([

                Forms\Components\Tabs\Tab::make('Basic Info')->schema([
                    Forms\Components\TextInput::make('name')
                        ->required()
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn($state, Forms\Set $set) =>
                            $set('slug', Str::slug($state)))
                        ->maxLength(255)
                        ->columnSpanFull(),

                    Forms\Components\TextInput::make('slug')
                        ->required()
                        ->unique(ignoreRecord: true)
                        ->maxLength(255)
                        ->columnSpanFull(),

                    Forms\Components\Textarea::make('short_description')
                        ->rows(2)
                        ->columnSpanFull(),

                    Forms\Components\RichEditor::make('description')
                        ->columnSpanFull(),

                    Forms\Components\Select::make('brand_id')
                        ->label('Brand')
                        ->options(Brand::active()->pluck('name', 'id'))
                        ->searchable(),

                    Forms\Components\Select::make('tax_rate_id')
                        ->label('Tax Rate')
                        ->options(TaxRate::active()->pluck('name', 'id'))
                        ->searchable(),

                    Forms\Components\CheckboxList::make('categories')
                        ->relationship('categories', 'name')
                        ->columns(3)
                        ->columnSpanFull(),
                ])->columns(2),

                Forms\Components\Tabs\Tab::make('Pricing & Stock')->schema([
                    Forms\Components\TextInput::make('base_price')
                        ->numeric()
                        ->prefix('₹')
                        ->required(),

                    Forms\Components\TextInput::make('wholesale_price')
                        ->numeric()
                        ->prefix('₹')
                        ->nullable(),

                    Forms\Components\Section::make('Inventory')->schema([
                        Forms\Components\TextInput::make('inventory.quantity')
                            ->label('Stock Quantity')
                            ->numeric()
                            ->default(0),

                        Forms\Components\TextInput::make('inventory.reserved_quantity')
                            ->label('Reserved')
                            ->numeric()
                            ->default(0)
                            ->disabled(),

                        Forms\Components\TextInput::make('inventory.low_stock_threshold')
                            ->label('Low Stock Alert At')
                            ->numeric()
                            ->default(5),
                    ])->columns(3),
                ])->columns(2),

                Forms\Components\Tabs\Tab::make('Images')->schema([
                    Forms\Components\Repeater::make('images')
                        ->relationship()
                        ->schema([
                            Forms\Components\FileUpload::make('path')
                                ->label('Image')
                                ->image()
                                ->disk('s3')
                                ->directory('products')
                                ->required(),

                            Forms\Components\TextInput::make('alt_text')
                                ->label('Alt Text'),

                            Forms\Components\TextInput::make('sort_order')
                                ->numeric()
                                ->default(0),

                            Forms\Components\Toggle::make('is_primary')
                                ->label('Primary Image'),
                        ])->columns(2),
                ]),

                Forms\Components\Tabs\Tab::make('SEO')->schema([
                    Forms\Components\TextInput::make('meta_title')->maxLength(255)->columnSpanFull(),
                    Forms\Components\Textarea::make('meta_description')->rows(3)->columnSpanFull(),
                ]),

                Forms\Components\Tabs\Tab::make('Status')->schema([
                    Forms\Components\Toggle::make('is_active')->default(true),
                    Forms\Components\Toggle::make('is_featured')->default(false),
                ])->columns(2),

            ])->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('primaryImage.path')
                    ->label('Image')
                    ->disk('s3')
                    ->square(),

                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('brand.name')
                    ->sortable(),

                Tables\Columns\TextColumn::make('base_price')
                    ->money('INR')
                    ->sortable(),

                Tables\Columns\TextColumn::make('inventory.quantity')
                    ->label('Stock')
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_active')->boolean(),
                Tables\Columns\IconColumn::make('is_featured')->boolean(),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('brand')
                    ->relationship('brand', 'name'),

                Tables\Filters\TernaryFilter::make('is_active')->label('Active'),
                Tables\Filters\TernaryFilter::make('is_featured')->label('Featured'),
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
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}
