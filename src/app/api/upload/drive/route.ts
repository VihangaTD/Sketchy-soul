import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isDriveConfigured, startOriginalUpload, finishOriginalUpload } from '@/lib/google-drive';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_BYTES } from '@/lib/validation';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), name: z.string().min(1).max(255), size: z.number().int().positive().max(MAX_PHOTO_BYTES), contentType: z.enum(ACCEPTED_IMAGE_TYPES) }),
  z.object({ action: z.literal('finish'), id: z.string().regex(/^[\w-]{1,200}$/), ticket: z.string().max(2048) }),
]);
export async function POST(request: Request) {
  const limit = rateLimit(`drive-upload:${clientIp(request.headers)}`, { limit: 80, windowMs: 10 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: 'Too many uploads. Please try again shortly.' }, { status: 429 });
  if (!isDriveConfigured()) return NextResponse.json({ error: 'Original photo storage is not connected.' }, { status: 503 });
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid image upload. Maximum original size is 10 MB.' }, { status: 400 });
    const data = parsed.data;
    const result = data.action === 'start'
      ? await startOriginalUpload(data.name, data.size, data.contentType, new URL(request.url).origin)
      : await finishOriginalUpload(data.id, data.ticket);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[drive-upload]', error instanceof Error ? error.message : 'Upload failed');
    return NextResponse.json({ error: 'Could not save your original photo to the studio. Please try again.' }, { status: 502 });
  }
}
