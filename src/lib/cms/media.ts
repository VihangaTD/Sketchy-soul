import { prisma } from '@/lib/prisma';

/**
 * The media library: every image the artist has uploaded for the site itself.
 *
 * Separate from order reference photos, which live under a different
 * Cloudinary folder and are never listed here — a customer's photograph is not
 * studio artwork and must not end up on the gallery page by accident.
 */

/** Folders exist only to filter the picker; nothing depends on the value. */
export const MEDIA_FOLDERS = [
  { value: 'gallery', label: 'Gallery artwork' },
  { value: 'carousel', label: 'Homepage slides' },
  { value: 'package', label: 'Package photos' },
  { value: 'page', label: 'Page images' },
  { value: 'general', label: 'Other' },
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number]['value'];

export const folderLabel = (value: string) =>
  MEDIA_FOLDERS.find((f) => f.value === value)?.label ?? 'Other';

/**
 * Where an image of this kind actually gets used.
 *
 * Uploading to the library places nothing on the site — it only makes the
 * image available in the pickers. That is the right design (one upload, used
 * in several places) but it is not self-evident, so an unused image says where
 * to go rather than only that it is unused.
 */
const FOLDER_DESTINATIONS: Record<string, { href: string; label: string }> = {
  gallery: { href: '/admin/gallery', label: 'Gallery' },
  carousel: { href: '/admin/pages#home', label: 'Page Copy → Homepage' },
  package: { href: '/admin/packages', label: 'Packages' },
  page: { href: '/admin/pages', label: 'Page Copy' },
};

export const folderDestination = (value: string) => FOLDER_DESTINATIONS[value] ?? null;

/** Everything in the library, newest first. Admin-only, so uncached. */
export function listMedia() {
  return prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
}

/**
 * Where each image is currently used, keyed by URL.
 *
 * Shown next to the delete button so nobody removes the picture that is
 * currently the homepage's "Family" slide without knowing it.
 */
export async function mediaUsage(): Promise<Map<string, string[]>> {
  const [pieces, slides, packages] = await Promise.all([
    prisma.portfolioPiece.findMany({
      where: { imageUrl: { not: null } },
      select: { title: true, imageUrl: true },
    }),
    prisma.studioSlide.findMany({
      where: { imageUrl: { not: null } },
      select: { label: true, imageUrl: true },
    }),
    prisma.package.findMany({
      where: { imageUrl: { not: null } },
      select: { name: true, imageUrl: true },
    }),
  ]);

  const usage = new Map<string, string[]>();
  const add = (url: string | null, where: string) => {
    if (!url) return;
    usage.set(url, [...(usage.get(url) ?? []), where]);
  };

  for (const piece of pieces) add(piece.imageUrl, `Gallery — ${piece.title}`);
  for (const slide of slides) add(slide.imageUrl, `Homepage — ${slide.label}`);
  for (const pkg of packages) add(pkg.imageUrl, `Package — ${pkg.name}`);

  return usage;
}
