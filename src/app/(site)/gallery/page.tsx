import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { GalleryGrid } from '@/components/GalleryGrid';
import { JsonLd } from '@/components/JsonLd';
import { getPortfolio } from '@/lib/cms/artwork';
import { copy, getCopy } from '@/lib/cms/copy';
import { absoluteImageUrl, absoluteUrl, SITE_URL } from '@/lib/site';
import { breadcrumbSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Portrait Gallery — Hand-Drawn Commission Work',
  description:
    'Browse completed commissions: graphite portraits, charcoal studies, family groups, pet and memorial portraits — every piece drawn by hand from a client photograph.',
  path: '/gallery',
  ownOgImage: true,
  keywords: [
    'portrait gallery',
    'pencil portrait examples',
    'commissioned drawing portfolio',
    'graphite portrait artist work',
  ],
});

export default async function GalleryPage() {
  const [pieces, blocks] = await Promise.all([getPortfolio(), getCopy()]);
  const t = (key: string) => copy(blocks, key);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Gallery', path: '/gallery' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': absoluteUrl('/gallery'),
            name: 'Portrait Gallery',
            description:
              'Completed portrait commissions — graphite, charcoal and colour pencil, each drawn by hand from a client photograph.',
            url: absoluteUrl('/gallery'),
            inLanguage: 'en',
            isPartOf: { '@id': `${SITE_URL}/#website` },
            /**
             * `image` is what turns a piece into a Google Images result, and
             * it was the one field missing: every artwork was described in
             * full — medium, year, artist — with no picture attached, which is
             * close to useless for a gallery whose entire product is the
             * picture.
             *
             * It is added per piece rather than gating the whole entry. A
             * piece with no scan yet renders the built-in line drawing, which
             * is a placeholder and not the artwork, so claiming it as the
             * image would be a lie — but the title, medium and year are still
             * true and still worth indexing. Dropping those pieces entirely
             * emptied `hasPart` on any gallery whose scans were not in yet.
             */
            hasPart: pieces.map((piece) => ({
              '@type': 'VisualArtwork',
              '@id': absoluteUrl(`/gallery#${piece.slug}`),
              name: piece.title,
              ...(absoluteImageUrl(piece.imageUrl)
                ? { image: absoluteImageUrl(piece.imageUrl) }
                : {}),
              ...(piece.imageAlt || piece.caption
                ? { description: piece.caption || piece.imageAlt }
                : {}),
              artMedium: piece.medium,
              artform: 'Drawing',
              /**
               * No dimensions field. `size` is defined on Product, not on
               * VisualArtwork, and the proper `width`/`height` want a
               * QuantitativeValue with a unit — which this data cannot supply
               * honestly, because the column is free text and holds both
               * "11×14" and "A4 · 21×29.7cm". An omitted property costs
               * nothing; an invented unit would be wrong half the time.
               */
              dateCreated: piece.year,
              creator: { '@id': `${SITE_URL}/#organization` },
              isPartOf: { '@id': absoluteUrl('/gallery') },
            })),
          },
        ]}
      />

      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('gallery.hero.eyebrow')}
            title={t('gallery.hero.title')}
            lede={t('gallery.hero.lede')}
          />
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="shell">
          <GalleryGrid pieces={pieces} />

          <div className="mt-16 border-t border-hairline pt-12 text-center">
            <h2 className="heading">{t('gallery.cta.title')}</h2>
            <p className="lede mx-auto mt-3 max-w-[42ch]">{t('gallery.cta.lede')}</p>
            {/* Both of these used to point at /packages with different words
                on them — a dead choice for the reader, and two internal links
                spent on one destination. The secondary now goes where somebody
                who does not see what they want on the price list actually
                needs to go. */}
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/packages" className="btn-primary w-full sm:w-auto">
                Choose a Package
              </Link>
              <Link href="/contact" className="btn-ghost w-full sm:w-auto">
                Ask for a Custom Quote
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
