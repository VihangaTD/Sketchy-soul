import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'Four sizes, one honest price each.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'Packages',
    headline: 'Four sizes, one honest price each.',
    footnote: 'A5 to A2, shipped worldwide',
  });
}
