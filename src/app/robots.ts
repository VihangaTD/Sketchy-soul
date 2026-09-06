import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Served at /robots.txt.
 *
 * ⚠️ DEPLOY: preview deployments should NOT be indexed. Vercel sets
 * VERCEL_ENV=preview automatically, and the block below turns crawling off
 * everywhere except production — so a preview URL can never outrank your real
 * domain.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const isPreview = process.env.VERCEL_ENV === 'preview';

  if (!isProduction || isPreview) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  /**
   * Paths no crawler should ever reach.
   *
   * These MUST be repeated in every user-agent group below. A robots.txt
   * crawler obeys exactly one group — the most specific one matching its name
   * — and ignores the rest entirely. Naming `Googlebot-Image` in its own group
   * therefore made it stop reading the `*` group, which is where these
   * exclusions used to live on their own: the image crawler was free to walk
   * /uploads/ and index customers' private reference photographs.
   */
  const privatePaths = [
    '/api/',
    '/admin',
    '/admin/',
    '/order/success',
    '/order/cancelled',
    '/uploads/', // customers' private reference photos
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      {
        // Explicit permission to index the gallery artwork, with the same
        // exclusions the wildcard group carries.
        userAgent: 'Googlebot-Image',
        allow: ['/', '/images/', '/_next/image'],
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
