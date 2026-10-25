import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isCloudinaryConfigured } from '@/lib/storage';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { MAX_PHOTO_BYTES } from '@/lib/validation';
import { isDriveConfigured } from '@/lib/google-drive';

export const runtime = 'nodejs';

/** Only signing data passes through Next.js; original file bytes go to Cloudinary. */
export async function POST(request: Request) {
  const limit = rateLimit(`upload-sign:${clientIp(request.headers)}`, { limit: 40, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: 'Too many uploads. Please wait and try again.' }, {
    status: 429, headers: { 'Retry-After': String(limit.retryAfter) },
  });
  if (!isCloudinaryConfigured()) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.json({ local: true });
    return NextResponse.json({ error: 'Photo storage is not configured.' }, { status: 503 });
  }
  const now = new Date();
  const params = {
    allowed_formats: 'jpg,jpeg,png,webp,heic,heif',
    folder: `orders/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    overwrite: 'false',
    public_id: randomUUID(),
    timestamp: String(Math.floor(now.getTime() / 1000)),
    ...(isDriveConfigured() ? { transformation: 'c_limit,w_2400,h_2400/q_86/f_jpg' } : {}),
  };
  const canonical = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  const signature = createHash('sha1').update(canonical + process.env.CLOUDINARY_API_SECRET!).digest('hex');
  return NextResponse.json({
    endpoint: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    params, signature, apiKey: process.env.CLOUDINARY_API_KEY, maxBytes: MAX_PHOTO_BYTES, driveEnabled: isDriveConfigured(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
