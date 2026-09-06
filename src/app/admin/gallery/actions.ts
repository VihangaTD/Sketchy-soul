'use server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { CMS_TAGS } from '@/lib/cms/cache';
import { PIECE_CATEGORIES } from '@/lib/portfolio';
import { flag, publish, requireAdmin, slugify, text } from '@/lib/admin/guard';

/**
 * Sends the browser back with one piece re-opened.
 *
 * Without this every save would collapse the whole gallery and drop you at the
 * top of the page. Must be the last thing an action does — `redirect()` works
 * by throwing.
 */
function backTo(anchor?: string): never {
  redirect(anchor ? `/admin/gallery?open=${anchor}#${anchor}` : '/admin/gallery');
}

/** Falls back to the first category rather than trusting the posted value. */
function category(formData: FormData) {
  const value = text(formData, 'category', 40);
  return PIECE_CATEGORIES.some((c) => c.id === value) ? value : PIECE_CATEGORIES[0].id;
}

function pieceFields(formData: FormData) {
  return {
    title: text(formData, 'title', 120),
    size: text(formData, 'size', 40),
    medium: text(formData, 'medium', 80),
    year: text(formData, 'year', 10),
    category: category(formData),
    imageUrl: text(formData, 'imageUrl', 2048) || null,
    imageAlt: text(formData, 'imageAlt', 300) || null,
    caption: text(formData, 'caption', 400) || null,
    featured: flag(formData, 'featured'),
    published: flag(formData, 'published'),
  };
}

export async function createPiece(formData: FormData) {
  await requireAdmin();

  const fields = pieceFields(formData);
  if (!fields.title) return;

  // A portfolio leads with the newest work, so a piece added today opens the
  // gallery rather than landing behind a dozen older ones.
  const { _min } = await prisma.portfolioPiece.aggregate({ _min: { sortOrder: true } });

  const created = await prisma.portfolioPiece.create({
    data: {
      ...fields,
      slug: await uniqueSlug(slugify(fields.title, 'piece')),
      sortOrder: (_min.sortOrder ?? 1) - 1,
      // Only ever seen before an artwork is chosen. Cycling the three built-in
      // drawings keeps an unfinished gallery from looking like a bug.
      sketch: ((await prisma.portfolioPiece.count()) % 3) + 1,
    },
  });

  await publish(CMS_TAGS.portfolio);
  backTo(`piece-${created.id}`);
}

export async function updatePiece(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  if (!id) return;

  const fields = pieceFields(formData);
  if (!fields.title) return;

  // `sortOrder` and `sketch` are left out of the update, which leaves whatever
  // the row already had.
  await prisma.portfolioPiece.update({ where: { id }, data: fields });
  await publish(CMS_TAGS.portfolio);
  backTo(`piece-${id}`);
}

export async function deletePiece(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  if (!id) return;

  // The image itself stays in the library — it may be used elsewhere, and
  // re-uploading a scan is far more annoying than deleting a row twice.
  await prisma.portfolioPiece.delete({ where: { id } });
  await publish(CMS_TAGS.portfolio);
  backTo();
}

async function uniqueSlug(base: string) {
  let candidate = base;
  let n = 2;

  while (await prisma.portfolioPiece.count({ where: { slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}
