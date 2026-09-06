import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'Photo to finished portrait, in five steps.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'The Process',
    headline: 'Photo to finished portrait, in five steps.',
    footnote: 'Preview sketch before any detail work',
  });
}
