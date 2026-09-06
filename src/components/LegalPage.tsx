import { SectionHead } from './SectionHead';
import { JsonLd } from './JsonLd';
import { LEGAL_UPDATED, formatLegalDate, type LegalPageKey } from '@/lib/legal';
import { legalPageSchema } from '@/lib/seo';

/**
 * Shared shell for Terms / Privacy / Shipping so the three legal pages stay
 * visually consistent and readable at any width.
 *
 * It also carries their structured data. These three were the only public
 * pages on the site with none at all — no breadcrumb trail under their search
 * result and no machine-readable revision date. Emitting it from here rather
 * than from each page means a new policy page cannot be added without it.
 */
export function LegalPage({
  eyebrow,
  title,
  page,
  path,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Which revision date to show — see src/lib/legal.ts. */
  page: LegalPageKey;
  /** Canonical path, e.g. "/privacy". Used for the breadcrumb and @id. */
  path: string;
  /** One line for the WebPage description. Matches the page's meta tag. */
  description: string;
  children: React.ReactNode;
}) {
  const modified = LEGAL_UPDATED[page];

  return (
    <>
      <JsonLd data={legalPageSchema({ title, description, path, modified })} />

      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <SectionHead as="h1" eyebrow={eyebrow} title={title} />
          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.16em] text-grey">
            {/* A machine-readable <time> as well as a human one, so the date a
                reader sees is the same one a crawler records. */}
            Last updated <time dateTime={modified}>{formatLegalDate(modified)}</time>
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="shell">
          <div className="mx-auto max-w-prose space-y-8 text-[13.5px] leading-[1.75] text-grey">
            {children}
          </div>
        </div>
      </section>
    </>
  );
}

export function Clause({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-[20px] font-medium text-ivory">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
