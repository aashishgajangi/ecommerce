<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use Filament\Actions\Action;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ManageSettings extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-cog-6-tooth';
    protected static ?string $navigationLabel = 'Site Settings';
    protected static ?string $title = 'Site Settings';
    protected static ?int $navigationSort = 99;
    protected static string|\UnitEnum|null $navigationGroup = 'Settings';

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'site_name'      => Setting::get('site_name', 'Hangout Cakes'),
            'site_tagline'   => Setting::get('site_tagline'),
            'logo_path'      => Setting::get('logo_path'),
            'favicon_path'   => Setting::get('favicon_path'),
            'contact_email'  => Setting::get('contact_email'),
            'contact_phone'  => Setting::get('contact_phone'),
            'address'        => Setting::get('address'),
            'facebook_url'   => Setting::get('facebook_url'),
            'instagram_url'  => Setting::get('instagram_url'),
            'twitter_url'    => Setting::get('twitter_url'),
            'notice_enabled' => (bool) Setting::get('notice_enabled', false),
            'notice_text'    => Setting::get('notice_text', 'This website is under development. No orders will be processed here — please place your orders on hangoutcakes.com'),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->components([
                Section::make('Site Notice')
                    ->description('Show a banner across the top of the storefront')
                    ->icon('heroicon-o-megaphone')
                    ->columns(1)
                    ->schema([
                        Forms\Components\Toggle::make('notice_enabled')
                            ->label('Enable notice banner')
                            ->helperText('When on, the notice text below is shown to all visitors.'),
                        Forms\Components\Textarea::make('notice_text')
                            ->label('Notice text')
                            ->rows(2)
                            ->placeholder('e.g. This website is under development…'),
                    ]),

                Section::make('Branding')
                    ->description('Site identity and visual assets')
                    ->icon('heroicon-o-paint-brush')
                    ->columns(2)
                    ->schema([
                        Forms\Components\TextInput::make('site_name')
                            ->label('Site Name')
                            ->required(),
                        Forms\Components\TextInput::make('site_tagline')
                            ->label('Tagline'),
                        Forms\Components\FileUpload::make('logo_path')
                            ->label('Logo')
                            ->image()
                            ->disk('s3')
                            ->visibility('public')
                            ->directory('settings')
                            ->imagePreviewHeight('80')
                            ->columnSpanFull(),
                        Forms\Components\FileUpload::make('favicon_path')
                            ->label('Favicon')
                            ->image()
                            ->disk('s3')
                            ->visibility('public')
                            ->directory('settings')
                            ->imagePreviewHeight('48')
                            ->columnSpanFull(),
                    ]),

                Section::make('Contact Information')
                    ->description('Shown in footer and contact pages')
                    ->icon('heroicon-o-envelope')
                    ->columns(2)
                    ->schema([
                        Forms\Components\TextInput::make('contact_email')
                            ->label('Email')
                            ->email(),
                        Forms\Components\TextInput::make('contact_phone')
                            ->label('Phone'),
                        Forms\Components\Textarea::make('address')
                            ->label('Address')
                            ->rows(2)
                            ->columnSpanFull(),
                    ]),

                Section::make('Social Media')
                    ->description('Links shown in footer')
                    ->icon('heroicon-o-share')
                    ->columns(3)
                    ->schema([
                        Forms\Components\TextInput::make('facebook_url')
                            ->label('Facebook')
                            ->url()
                            ->placeholder('https://facebook.com/...'),
                        Forms\Components\TextInput::make('instagram_url')
                            ->label('Instagram')
                            ->url()
                            ->placeholder('https://instagram.com/...'),
                        Forms\Components\TextInput::make('twitter_url')
                            ->label('Twitter / X')
                            ->url()
                            ->placeholder('https://x.com/...'),
                    ]),
            ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            EmbeddedSchema::make('form'),
        ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        $this->revalidateFrontend();

        Notification::make()
            ->title('Settings saved successfully')
            ->success()
            ->send();
    }

    private function revalidateFrontend(): void
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL')), '/');
        $secret      = env('REVALIDATE_SECRET');

        if (! $frontendUrl || ! $secret) {
            return;
        }

        try {
            \Illuminate\Support\Facades\Http::timeout(5)
                ->withHeader('x-revalidate-secret', $secret)
                ->post("{$frontendUrl}/api/revalidate", ['tag' => 'site-settings']);
        } catch (\Throwable) {
            // Non-fatal — frontend will revalidate on its own schedule
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('save')
                ->label('Save Settings')
                ->action('save')
                ->color('primary')
                ->icon('heroicon-o-check'),
        ];
    }
}
