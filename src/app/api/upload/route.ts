import { NextResponse } from 'next/server';
import { saveFile } from '@/lib/storage';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTOS, MAX_PHOTO_BYTES } from '@/lib/validation';
import { matchesClaim, sniffImageType } from '@/lib/image-signature';

/**
 * POST /api/upload — reference photo upload.
 *
 * Production uploads go directly to Cloudinary. This route accepts original
 * files for local development and legacy callers.
 *
 * Files land in Cloudinary in production and in public/uploads locally. Only
 * the URL Cloudinary returns is ever stored: it goes onto the order row, and
 * from there into the Google Sheet / Form row when the payment clears.
 */

// File handling needs the Node runtime, not Edge.
export const runtime = 'nodejs';
// Never cache an upload response.
export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`upload:${ip}`, { limit: 40, windowMs: 10 * 60 * 1000 });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 });
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: 'No file was received.' }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Please upload at most ${MAX_PHOTOS} photos.` },
      { status: 400 },
    );
  }


  for (const file of files) {


    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        { error: `"${file.name}" is not a supported image (JPEG, PNG, WebP or HEIC).` },
        { status: 415 },
      );
    }

    // `file.type` is just a string the browser sent. This route is public, so
    // the bytes themselves have to agree before anything is written to the
    // studio's permanent, publicly-readable image library.
    const detected = await sniffImageType(file);
    if (!detected || !matchesClaim(detected, file.type)) {
      return NextResponse.json(
        { error: `"${file.name}" is not a readable image file. Please choose a photo.` },
        { status: 415 },
      );
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        {
          error: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${
            MAX_PHOTO_BYTES / 1024 / 1024
          } MB per photo. Try a smaller copy, or a JPEG rather than the original.`,
        },
        { status: 413 },
      );
    }
  }

  // Month-based folders keep the storage bucket navigable a year from now.
  const now = new Date();
  const prefix = `orders/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  try {
    const photos = await Promise.all(files.map((file) => saveFile(file, prefix)));
    return NextResponse.json({ photos }, { status: 201 });
  } catch (error) {
    console.error('[upload] failed:', error);
    return NextResponse.json(
      {
        error:
          'Upload failed. If this keeps happening, email the photos to us and we will attach them to your order.',
      },
      { status: 500 },
    );
  }
}
