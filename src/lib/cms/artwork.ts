import { prisma } from '@/lib/prisma';
import {
  DEFAULT_PORTFOLIO,
  DEFAULT_STUDIO_SLIDES,
  type PortfolioCategory,
  type PortfolioPiece,
  type StudioSlide,
} from '@/lib/portfolio';
import { CMS_TAGS, cmsRead, toSketch } from './cache';

/** Gallery pieces, in the order the artist arranged them. */
export const getPortfolio = cmsRead<PortfolioPiece[]>({
  key: 'portfolio',
  tag: CMS_TAGS.portfolio,
  fallback: () => DEFAULT_PORTFOLIO,
  load: async () => {
    const rows = await prisma.portfolioPiece.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
    });

    if (rows.length === 0) return null;

    return rows.map(
      (p): PortfolioPiece => ({
        slug: p.slug,
        title: p.title,
        size: p.size,
        medium: p.medium,
        year: p.year,
        category: p.category as PortfolioCategory,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
        sketch: toSketch(p.sketch),
        caption: p.caption,
        featured: p.featured,
      }),
    );
  },
});

/** The four "From the Studio" homepage slides. */
export const getStudioSlides = cmsRead<StudioSlide[]>({
  key: 'slides',
  tag: CMS_TAGS.slides,
  fallback: () => DEFAULT_STUDIO_SLIDES,
  load: async () => {
    const rows = await prisma.studioSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (rows.length === 0) return null;

    return rows.map(
      (s): StudioSlide => ({
        id: s.id,
        label: s.label,
        blurb: s.blurb,
        imageUrl: s.imageUrl,
        imageAlt: s.alt,
        sketch: toSketch(s.sketch),
      }),
    );
  },
});

/* ── Admin reads (uncached, include unpublished) ───────────────────────────*/

export function listPortfolioForAdmin() {
  return prisma.portfolioPiece.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
}

export function listSlidesForAdmin() {
  return prisma.studioSlide.findMany({ orderBy: { sortOrder: 'asc' } });
}
