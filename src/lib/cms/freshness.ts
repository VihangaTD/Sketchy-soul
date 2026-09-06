import { prisma } from '@/lib/prisma';
import { isDatabaseConfigured } from '@/lib/prisma';

/**
 * When the content behind each page was last edited.
 *
 * sitemap.xml used to stamp `lastModified: new Date()` on every URL, which
 * says "all ten pages changed the instant you asked". A crawler that checks
 * twice and finds identical content both times learns that this site's lastmod
 * carries no information, and from then on ignores it — so the one signal that
 * would have got a genuine price change recrawled quickly is spent.
 *
 * Reading the real `updatedAt` off the content tables costs one round trip and
 * makes the field mean something again.
 *
 * Never throws. An unseeded or unreachable database falls back to the build
 * time, which is accurate for a site still rendering the defaults from code —
 * and a sitemap that 500s is far worse than one with an approximate date.
 */

export interface ContentFreshness {
  catalogue: Date;
  portfolio: Date;
  editorial: Date;
  copy: Date;
  /** Newest of all of the above — used for the homepage. */
  any: Date;
}

const newest = (dates: (Date | null | undefined)[], fallback: Date): Date => {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  return times.length > 0 ? new Date(Math.max(...times)) : fallback;
};

export async function contentFreshness(): Promise<ContentFreshness> {
  const fallback = new Date();
  const flat = (value: Date) => ({
    catalogue: value,
    portfolio: value,
    editorial: value,
    copy: value,
    any: value,
  });

  if (!isDatabaseConfigured()) return flat(fallback);

  try {
    // Newest row per table. `findFirst` ordered by updatedAt returns a single
    // row — cheaper than an aggregate, and only the newest one matters here.
    const args = { orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } } as const;

    const [pkg, addOn, delivery, style, piece, faq, testimonial, step, assurance, slide, block] =
      await Promise.all([
        prisma.package.findFirst(args),
        prisma.addOn.findFirst(args),
        prisma.deliveryOption.findFirst(args),
        prisma.styleOption.findFirst(args),
        prisma.portfolioPiece.findFirst(args),
        prisma.faq.findFirst(args),
        prisma.testimonial.findFirst(args),
        prisma.processStep.findFirst(args),
        prisma.assurance.findFirst(args),
        prisma.studioSlide.findFirst(args),
        prisma.contentBlock.findFirst(args),
      ]);

    const at = (row: { updatedAt: Date } | null) => row?.updatedAt ?? null;

    const catalogue = newest([at(pkg), at(addOn), at(delivery), at(style)], fallback);
    const portfolio = newest([at(piece)], fallback);
    const editorial = newest([at(faq), at(testimonial), at(step), at(assurance)], fallback);
    const copy = newest([at(block), at(slide)], fallback);

    return {
      catalogue,
      portfolio,
      editorial,
      copy,
      any: newest([catalogue, portfolio, editorial, copy], fallback),
    };
  } catch (error) {
    // Missing tables on a first deploy land here, exactly as in cmsRead().
    console.warn(
      '[sitemap] Falling back to build time for lastmod:',
      error instanceof Error ? error.message.split('\n')[0] : error,
    );
    return flat(fallback);
  }
}
