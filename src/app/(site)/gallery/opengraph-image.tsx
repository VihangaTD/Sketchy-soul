import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'Completed commissions, drawn entirely by hand.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'Gallery',
    headline: 'Completed commissions, drawn entirely by hand.',
    footnote: 'Graphite, charcoal and colour pencil',
  });
}
