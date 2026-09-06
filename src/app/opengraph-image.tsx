import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';
import { site } from '@/lib/site';

/**
 * The site-wide social card, used by the homepage and by any page that has no
 * card of its own. The drawing itself lives in src/lib/og-card.tsx, which the
 * per-page cards share.
 *
 * Preview it at /opengraph-image.
 */
export const alt = `${site.name} — ${site.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return ogCard({
    eyebrow: site.tagline,
    headline: 'Every face tells a story worth keeping.',
  });
}
