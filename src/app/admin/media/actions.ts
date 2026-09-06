'use server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { deleteFile, saveFile } from '@/lib/storage';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/validation';
import { matchesClaim, sniffImageType } from '@/lib/image-signature';
import { CMS_TAGS } from '@/lib/cms/cache';
import { publish, requireAdmin, text } from '@/lib/admin/guard';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadMedia(formData: FormData) {
  await requireAdmin();

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  // The folder becomes part of a filesystem path (local driver) and a
  // Cloudinary folder, so it is reduced to a plain slug rather than trusted —
  // "../../" in this field would otherwise escape public/uploads entirely.
  const folder = (text(formData, 'folder', 40) || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'general';
  const alt = text(formData, 'alt', 300);

  // Rejections used to be a silent `continue`, so choosing a PDF or a 20 MB
  // TIFF looked exactly like a successful upload that produced nothing. The
  // reasons are collected and reported back to the page instead.
  const skipped: string[] = [];

  for (const file of files.slice(0, 12)) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      skipped.push(`${file.name} — not a JPEG, PNG, WebP or HEIC`);
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      skipped.push(
        `${file.name} — ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ${
          MAX_UPLOAD_BYTES / 1024 / 1024
        } MB limit`,
      );
      continue;
    }

    const detected = await sniffImageType(file);
    if (!detected || !matchesClaim(detected, file.type)) {
      skipped.push(`${file.name} — the file is not a readable image`);
      continue;
    }

    // Same storage driver as customer photos, different prefix so the bucket
    // stays browsable and site artwork is never mixed in with order evidence.
    const stored = await saveFile(file, `site/${folder}`);

    await prisma.mediaAsset.create({
      data: {
        url: stored.url,
        pathname: stored.pathname,
        name: stored.name,
        alt,
        size: stored.size,
        contentType: stored.contentType,
        // Cloudinary reports these on upload; the local dev driver cannot.
        width: stored.width,
        height: stored.height,
        folder,
      },
    });
  }

  await publish(CMS_TAGS.media);

  // A plain form action has no return value the page can render, so the
  // rejections come back on the query string and are shown as a notice.
  if (skipped.length > 0) {
    redirect(`/admin/media?skipped=${encodeURIComponent(skipped.join('\n'))}`);
  }
}

export async function updateMedia(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  if (!id) return;

  await prisma.mediaAsset.update({
    where: { id },
    data: {
      alt: text(formData, 'alt', 300),
      folder: text(formData, 'folder', 40) || 'general',
    },
  });

  await publish(CMS_TAGS.media);
}

/**
 * Deletes the row and the stored object.
 *
 * Anything already pointing at the image keeps its copy of the URL and will
 * fall back to the built-in line drawing once the file 404s, so this cannot
 * break a page — but the warning in the UI still tells the artist where the
 * image is in use before they commit.
 */
export async function deleteMedia(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  if (!id) return;

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;

  await prisma.mediaAsset.delete({ where: { id } });
  // `pathname` is the Cloudinary public id. Rows written before the move to
  // Cloudinary hold a URL there, which deleteFile() reduces to an id itself.
  await deleteFile(asset.pathname || asset.url);

  await publish(CMS_TAGS.media);
}
