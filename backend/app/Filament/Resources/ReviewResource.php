<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReviewResource\Pages;
use App\Models\Review;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class ReviewResource extends Resource
{
    protected static ?string $model = Review::class;
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-star';
    protected static string|\UnitEnum|null $navigationGroup = 'Engagement';
    protected static ?int $navigationSort = 1;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Section::make()->schema([
                Forms\Components\TextInput::make('product.name')->disabled(),
                Forms\Components\TextInput::make('user.name')->disabled(),
                Forms\Components\TextInput::make('rating')->disabled(),
                Forms\Components\TextInput::make('title')->disabled(),
                Forms\Components\Textarea::make('body')->disabled()->rows(4)->columnSpanFull(),
                Forms\Components\Toggle::make('is_approved'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('product.name')->searchable(),
                Tables\Columns\TextColumn::make('user.name')->label('Customer'),
                Tables\Columns\TextColumn::make('rating'),
                Tables\Columns\TextColumn::make('title')->limit(40),
                Tables\Columns\IconColumn::make('is_approved')->boolean(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_approved')->label('Approved'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReviews::route('/'),
            'edit' => Pages\EditReview::route('/{record}/edit'),
        ];
    }
}
