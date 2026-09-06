import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/** Social card for this page — see src/lib/og-card.tsx. */
export const alt = 'Tell us about the portrait you have in mind.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: 'Contact',
    headline: 'Tell us about the portrait you have in mind.',
    footnote: 'Custom quotes welcome',
  });
}
