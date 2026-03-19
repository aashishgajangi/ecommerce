<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends ApiController
{
    public function presign(Request $request): JsonResponse
    {
        $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:products,banners,avatars'],
        ]);

        $ext = pathinfo($request->filename, PATHINFO_EXTENSION);
        $key = "{$request->type}/" . Str::uuid() . ".{$ext}";

        // MinIO / S3 presigned URL (15-minute expiry)
        $url = Storage::disk('s3')->temporaryUrl($key, now()->addMinutes(15));

        return $this->success([
            'upload_url' => $url,
            'key' => $key,
        ]);
    }
}
