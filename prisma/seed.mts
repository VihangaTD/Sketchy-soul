/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  SEED — copies the defaults in src/lib into the content tables           ║
 * ║                                                                          ║
 * ║      npm run db:seed                                                     ║
 * ║                                                                          ║
 * ║  Run it once after the first `prisma migrate deploy`. Until it has run,  ║
 * ║  the site renders the same defaults straight from code, so seeding is    ║
 * ║  what makes the content editable rather than what makes it appear.      ║
 * ║                                                                          ║
 * ║  SAFE TO RE-RUN. Every write is an upsert keyed on a stable id or slug,  ║
 * ║  and `update` only ever restores the default copy — so re-running is a   ║
 * ║  deliberate "reset everything back to the shipped text". Pass --missing  ║
 * ║  to add only rows that do not exist yet and leave your edits alone.      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Run by Node directly, not by the Prisma CLI, so two details matter:
 *
 *   • `.mts` marks it as an ES module, which lets Node strip the types without
 *     guessing at the module system (and without a build step or `tsx`).
 *   • `--env-file-if-exists=.env` in the npm script is what loads DATABASE_URL.
 *     The Prisma CLI reads `.env` on your behalf; a bare `node` process does
 *     not, and Prisma then fails with "Environment variable not found".
 *     `-if-exists` so it still works where the environment is already set —
 *     CI, a container, or `vercel env pull`-less production.
 */

import { PrismaClient } from '@prisma/client';

import {
  DEFAULT_ADD_ONS,
  DEFAULT_DELIVERY_OPTIONS,
  DEFAULT_EXTRA_SUBJECT_PRICE,
  DEFAULT_MAX_SUBJECTS,
  DEFAULT_PACKAGES,
  DEFAULT_STYLES,
} from '../src/lib/packages.ts';
import { DEFAULT_PORTFOLIO, DEFAULT_STUDIO_SLIDES } from '../src/lib/portfolio.ts';
import {
  DEFAULT_ASSURANCES,
  DEFAULT_FAQS,
  DEFAULT_PROCESS,
  DEFAULT_TESTIMONIALS,
} from '../src/lib/content.ts';

const prisma = new PrismaClient();

/** `--missing` creates absent rows but never overwrites an edited one. */
const onlyMissing = process.argv.includes('--missing');

/** Upsert that respects --missing. */
async function put<T extends { id: string }>(
  label: string,
  rows: T[],
  write: (row: T, index: number) => Promise<unknown>,
  exists: (row: T) => Promise<boolean>,
) {
  let written = 0;
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    if (onlyMissing && (await exists(row))) {
      skipped += 1;
      continue;
    }
    await write(row, index);
    written += 1;
  }

  console.log(`  ${label.padEnd(16)} ${written} written${skipped ? `, ${skipped} kept` : ''}`);
}

async function main() {
  console.log('Seeding content tables…\n');

  /* ── Pricing ───────────────────────────────────────────────────────────── */

  await put(
    'packages',
    DEFAULT_PACKAGES,
    (pkg, i) => {
      const data = {
        slug: pkg.slug,
        name: pkg.name,
        size: pkg.size,
        sizeShort: pkg.sizeShort,
        price: pkg.price,
        blurb: pkg.blurb,
        includes: pkg.includes,
        subjectsIncluded: pkg.subjectsIncluded,
        turnaround: pkg.turnaround,
        featured: Boolean(pkg.featured),
        sketch: pkg.sketch,
        sortOrder: i,
        active: true,
      };
      return prisma.package.upsert({
        where: { id: pkg.id },
        create: { id: pkg.id, ...data },
        update: data,
      });
    },
    async (pkg) => (await prisma.package.count({ where: { id: pkg.id } })) > 0,
  );

  await put(
    'add-ons',
    DEFAULT_ADD_ONS,
    (addOn, i) => {
      const data = {
        name: addOn.name,
        description: addOn.description,
        price: addOn.price,
        sortOrder: i,
        active: true,
      };
      return prisma.addOn.upsert({
        where: { id: addOn.id },
        create: { id: addOn.id, ...data },
        update: data,
      });
    },
    async (a) => (await prisma.addOn.count({ where: { id: a.id } })) > 0,
  );

  await put(
    'delivery',
    DEFAULT_DELIVERY_OPTIONS,
    (option, i) => {
      const data = {
        name: option.name,
        description: option.description,
        price: option.price,
        requiresAddress: option.requiresAddress,
        sortOrder: i,
        active: true,
      };
      return prisma.deliveryOption.upsert({
        where: { id: option.id },
        create: { id: option.id, ...data },
        update: data,
      });
    },
    async (d) => (await prisma.deliveryOption.count({ where: { id: d.id } })) > 0,
  );

  await put(
    'mediums',
    DEFAULT_STYLES,
    (style, i) => {
      const data = { name: style.name, description: style.description, sortOrder: i, active: true };
      return prisma.styleOption.upsert({
        where: { id: style.id },
        create: { id: style.id, ...data },
        update: data,
      });
    },
    async (s) => (await prisma.styleOption.count({ where: { id: s.id } })) > 0,
  );

  /* ── Pricing scalars ───────────────────────────────────────────────────── */

  const settings = [
    { key: 'pricing.extraSubjectPrice', value: String(DEFAULT_EXTRA_SUBJECT_PRICE) },
    { key: 'pricing.maxSubjects', value: String(DEFAULT_MAX_SUBJECTS) },
  ];

  await put(
    'settings',
    settings.map((s) => ({ id: s.key, ...s })),
    (setting) =>
      prisma.siteSetting.upsert({
        where: { key: setting.key },
        create: { key: setting.key, value: setting.value },
        update: { value: setting.value },
      }),
    async (s) => (await prisma.siteSetting.count({ where: { key: s.key } })) > 0,
  );

  /* ── Artwork ───────────────────────────────────────────────────────────── */

  await put(
    'gallery',
    DEFAULT_PORTFOLIO.map((p) => ({ ...p, id: p.slug })),
    (piece, i) => {
      const data = {
        title: piece.title,
        size: piece.size,
        medium: piece.medium,
        year: piece.year,
        category: piece.category,
        imageUrl: piece.imageUrl ?? null,
        imageAlt: piece.imageAlt ?? null,
        sketch: piece.sketch,
        caption: piece.caption ?? null,
        featured: Boolean(piece.featured),
        sortOrder: i,
        published: true,
      };
      return prisma.portfolioPiece.upsert({
        where: { slug: piece.slug },
        create: { slug: piece.slug, ...data },
        update: data,
      });
    },
    async (p) => (await prisma.portfolioPiece.count({ where: { slug: p.slug } })) > 0,
  );

  await put(
    'carousel',
    DEFAULT_STUDIO_SLIDES,
    (slide, i) => {
      const data = {
        label: slide.label,
        blurb: slide.blurb,
        imageUrl: slide.imageUrl ?? null,
        alt: slide.imageAlt,
        sketch: slide.sketch,
        sortOrder: i,
        active: true,
      };
      return prisma.studioSlide.upsert({
        where: { id: slide.id },
        create: { id: slide.id, ...data },
        update: data,
      });
    },
    async (s) => (await prisma.studioSlide.count({ where: { id: s.id } })) > 0,
  );

  /* ── Editorial ─────────────────────────────────────────────────────────────
     These have no natural id in code, so they are keyed on a deterministic
     slug of their first field. That keeps re-runs idempotent without
     duplicating rows. */

  await put(
    'process',
    DEFAULT_PROCESS.map((p) => ({ ...p, id: `step-${p.num}` })),
    (step, i) =>
      prisma.processStep.upsert({
        where: { id: step.id },
        create: {
          id: step.id,
          num: step.num,
          title: step.title,
          body: step.body,
          sortOrder: i,
        },
        update: { num: step.num, title: step.title, body: step.body, sortOrder: i },
      }),
    async (s) => (await prisma.processStep.count({ where: { id: s.id } })) > 0,
  );

  await put(
    'testimonials',
    DEFAULT_TESTIMONIALS.map((t, i) => ({ ...t, id: `testimonial-${i + 1}` })),
    (t, i) =>
      prisma.testimonial.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          quote: t.quote,
          author: t.author,
          meta: t.meta,
          rating: t.rating,
          placeholder: Boolean(t.placeholder),
          sortOrder: i,
        },
        update: {
          quote: t.quote,
          author: t.author,
          meta: t.meta,
          rating: t.rating,
          placeholder: Boolean(t.placeholder),
          sortOrder: i,
        },
      }),
    async (t) => (await prisma.testimonial.count({ where: { id: t.id } })) > 0,
  );

  await put(
    'faqs',
    DEFAULT_FAQS.map((f, i) => ({ ...f, id: `faq-${i + 1}` })),
    (faq, i) =>
      prisma.faq.upsert({
        where: { id: faq.id },
        create: { id: faq.id, question: faq.question, answer: faq.answer, sortOrder: i },
        update: { question: faq.question, answer: faq.answer, sortOrder: i },
      }),
    async (f) => (await prisma.faq.count({ where: { id: f.id } })) > 0,
  );

  await put(
    'assurances',
    DEFAULT_ASSURANCES.map((a, i) => ({ ...a, id: `assurance-${i + 1}` })),
    (item, i) =>
      prisma.assurance.upsert({
        where: { id: item.id },
        create: { id: item.id, title: item.title, body: item.body, sortOrder: i },
        update: { title: item.title, body: item.body, sortOrder: i },
      }),
    async (a) => (await prisma.assurance.count({ where: { id: a.id } })) > 0,
  );

  console.log('\nDone. Everything above is now editable at /admin.');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
