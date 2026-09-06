'use server';

import { prisma } from '@/lib/prisma';
import { CMS_TAGS } from '@/lib/cms/cache';
import { flag, int, publish, requireAdmin, text } from '@/lib/admin/guard';

/**
 * Editorial copy: client quotes, the FAQ and the trust badges under the hero.
 *
 * Two of these also feed structured data — the FAQ becomes the expandable Q&A
 * rows in Google, the quotes become review markup — so an edit here changes
 * what search engines see, not just what visitors read.
 *
 * The order process is no longer edited here. Its steps still come from the
 * `ProcessStep` table (or the defaults in src/lib/editorial.ts when that table
 * is empty) and still render on the homepage and /process.
 */

/* ── Testimonials ──────────────────────────────────────────────────────────*/

export async function saveTestimonial(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  const data = {
    quote: text(formData, 'quote', 600),
    author: text(formData, 'author', 80),
    meta: text(formData, 'meta', 80),
    rating: int(formData, 'rating', 5, 1, 5),
    // Marking a quote as a placeholder keeps it out of review structured data.
    placeholder: flag(formData, 'placeholder'),
    published: flag(formData, 'published'),
    sortOrder: int(formData, 'sortOrder', 0, 0, 999),
  };

  if (!data.quote || !data.author) return;

  if (id) {
    await prisma.testimonial.update({ where: { id }, data });
  } else {
    const count = await prisma.testimonial.count();
    await prisma.testimonial.create({ data: { ...data, sortOrder: count, published: true } });
  }

  await publish(CMS_TAGS.editorial);
}

export async function deleteTestimonial(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 40);
  if (!id) return;

  await prisma.testimonial.delete({ where: { id } });
  await publish(CMS_TAGS.editorial);
}

/* ── FAQ ───────────────────────────────────────────────────────────────────*/

export async function saveFaq(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  const data = {
    question: text(formData, 'question', 300),
    answer: text(formData, 'answer', 2000),
    published: flag(formData, 'published'),
    sortOrder: int(formData, 'sortOrder', 0, 0, 999),
  };

  if (!data.question || !data.answer) return;

  if (id) {
    await prisma.faq.update({ where: { id }, data });
  } else {
    const count = await prisma.faq.count();
    await prisma.faq.create({ data: { ...data, sortOrder: count, published: true } });
  }

  await publish(CMS_TAGS.editorial);
}

export async function deleteFaq(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 40);
  if (!id) return;

  await prisma.faq.delete({ where: { id } });
  await publish(CMS_TAGS.editorial);
}

/* ── Assurances ────────────────────────────────────────────────────────────*/

export async function saveAssurance(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 40);
  const data = {
    title: text(formData, 'title', 80),
    body: text(formData, 'body', 200),
    published: flag(formData, 'published'),
    sortOrder: int(formData, 'sortOrder', 0, 0, 999),
  };

  if (!data.title) return;

  if (id) {
    await prisma.assurance.update({ where: { id }, data });
  } else {
    const count = await prisma.assurance.count();
    await prisma.assurance.create({ data: { ...data, sortOrder: count, published: true } });
  }

  await publish(CMS_TAGS.editorial);
}

export async function deleteAssurance(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 40);
  if (!id) return;

  await prisma.assurance.delete({ where: { id } });
  await publish(CMS_TAGS.editorial);
}
