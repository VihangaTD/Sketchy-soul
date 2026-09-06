import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'One artist, one drawing at a time.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'The Studio',
    headline: 'One artist, one drawing at a time.',
    footnote: 'No filters, no templates, no AI',
  });
}
