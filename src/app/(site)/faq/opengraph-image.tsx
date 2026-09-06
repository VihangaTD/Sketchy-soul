import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'Everything people ask before commissioning.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'Questions',
    headline: 'Everything people ask before commissioning.',
    footnote: 'Turnaround, shipping, revisions and refunds',
  });
}
