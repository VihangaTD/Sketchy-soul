/**
 * When each legal page was last revised.
 *
 * ISO dates rather than the prose the page prints, because three separate
 * things need this and they must not drift apart:
 *
 *   • the "Last updated" line a reader sees;
 *   • `dateModified` in the page's structured data;
 *   • `lastmod` in sitemap.xml, which is how a crawler decides whether a
 *     revisit is worth its time.
 *
 * ⚠️ Bump the date here whenever you change the wording of a policy — an
 * unchanged date on changed terms is the kind of thing that matters if a
 * refund is ever disputed.
 */
export const LEGAL_UPDATED = {
  terms: '2026-08-01',
  privacy: '2026-08-01',
  shipping: '2026-08-01',
} as const;

export type LegalPageKey = keyof typeof LEGAL_UPDATED;

/** "2026-08-01" → "1 August 2026". */
export function formatLegalDate(iso: string): string {
  // Parsed as UTC and formatted as UTC, so the printed day cannot shift by one
  // depending on where the server happens to be running.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function legalDate(key: LegalPageKey): Date {
  return new Date(`${LEGAL_UPDATED[key]}T00:00:00Z`);
}
