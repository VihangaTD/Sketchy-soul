import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { contentFreshness } from '@/lib/cms/freshness';
import { legalDate } from '@/lib/legal';

/**
 * XML sitemap, served at /sitemap.xml and referenced from robots.txt.
 *
 * ⚠️ DEPLOY: after the first deploy, submit
 * https://your-domain.com/sitemap.xml in Google Search Console →
 * Sitemaps. That is what gets the site crawled in days rather than weeks.
 *
 * Checkout, confirmation and admin pages are deliberately absent — they carry
 * no search value and would waste crawl budget.
 *
 * Two rules this file follows:
 *
 *   1. `lastModified` is the date the page's content actually changed, read
 *      from the CMS tables. Stamping "now" on every URL, as this used to,
 *      teaches a crawler that the field is noise and it stops being read.
 *
 *   2. Only canonical, indexable URLs appear. Nothing that resolves to another
 *      page belongs here.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fresh = await contentFreshness();

  const routes: {
    path: string;
    priority: number;
    frequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    lastModified: Date;
  }[] = [
    // The homepage reflects packages, the carousel, testimonials and the
    // process steps, so any content edit is a change to it.
    { path: '/', priority: 1, frequency: 'weekly', lastModified: fresh.any },
    { path: '/gallery', priority: 0.9, frequency: 'weekly', lastModified: fresh.portfolio },
    { path: '/packages', priority: 0.9, frequency: 'monthly', lastModified: fresh.catalogue },
    { path: '/process', priority: 0.7, frequency: 'monthly', lastModified: fresh.editorial },
    { path: '/about', priority: 0.6, frequency: 'monthly', lastModified: fresh.copy },
    { path: '/faq', priority: 0.6, frequency: 'monthly', lastModified: fresh.editorial },
    { path: '/contact', priority: 0.6, frequency: 'yearly', lastModified: fresh.copy },
    { path: '/shipping', priority: 0.3, frequency: 'yearly', lastModified: legalDate('shipping') },
    { path: '/terms', priority: 0.2, frequency: 'yearly', lastModified: legalDate('terms') },
    { path: '/privacy', priority: 0.2, frequency: 'yearly', lastModified: legalDate('privacy') },
  ];

  /**
   * The per-package `#anchor` entries that used to sit here are gone.
   *
   * A crawler discards the fragment, so `/packages#a4-signature` and
   * `/packages#a2-grand` were both submitted, and both counted, as
   * `/packages` — four duplicate rows advertising one URL at a lower priority
   * than the row that already covers it properly. The long-tail queries they
   * were meant to catch are served by the Product structured data on the
   * packages page instead, which is the mechanism actually designed for it.
   */
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: route.lastModified,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));
}
