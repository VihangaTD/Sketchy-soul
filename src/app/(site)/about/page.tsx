import { getSiteDetails } from '@/lib/cms/contact';
import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { ArtFrame } from '@/components/ArtFrame';
import { JsonLd } from '@/components/JsonLd';
import { copy, getCopy } from '@/lib/cms/copy';
import { gridColumns } from '@/lib/layout';
import { breadcrumbSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'About the Studio — The Artist Behind Sketchy Soul',
  description:
    'A one-artist portrait studio working in graphite, charcoal and colour pencil. Every commission drawn by hand, from your photograph, with a preview sketch before the final piece.',
  path: '/about',
  ownOgImage: true,
  keywords: ['portrait artist', 'about the artist', 'hand drawn not AI', 'graphite artist studio'],
});

/**
 * Every word and the studio photograph are editable at /admin/pages → About.
 * The structure stays in code because it is what converts a browser into a
 * buyer; only the content changes.
 */
export default async function AboutPage() {
  const site = await getSiteDetails();
  const blocks = await getCopy();
  const t = (key: string) => copy(blocks, key, { city: site.location.city });

  const photo = t('about.photo.url');

  // Clearing a title in the admin removes that column rather than leaving
  // an empty cell in the row.
  const practices = [1, 2, 3]
    .map((n) => ({
      title: t(`about.practice.${n}.title`),
      body: t(`about.practice.${n}.body`),
    }))
    .filter((item) => item.title);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: `About ${site.name}`,
            description: site.longDescription,
          },
        ]}
      />

      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('about.hero.eyebrow')}
            title={t('about.hero.title')}
            lede={t('about.hero.lede')}
          />
        </div>
      </section>

      <section className="pb-16">
        <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <ArtFrame
            src={photo || undefined}
            alt={t('about.photo.alt')}
            sketch={2}
            ratio="aspect-[4/5]"
            sizes="(max-width: 1024px) 90vw, 45vw"
            priority
          />

          <div className="space-y-5">
            {[1, 2, 3, 4].map((n) => {
              const paragraph = t(`about.body.${n}`);
              return paragraph ? (
                <p key={n} className="lede">
                  {paragraph}
                </p>
              ) : null;
            })}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/gallery" className="btn-ghost btn-sm">
                See the Work
              </Link>
              <Link href="/packages" className="btn-primary btn-sm">
                Choose a Package
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Numbers ──────────────────────────────────────────────────────── */}
      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <SectionHead eyebrow={t('about.practice.eyebrow')} title={t('about.practice.title')} />

          <div className={`mt-10 grid gap-8 ${gridColumns(practices.length, 3)}`}>
            {practices.map((item) => (
              <div key={item.title}>
                <h3 className="subheading">{item.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-grey">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gold-wash-b section text-center">
        <div className="shell">
          <SectionHead eyebrow={t('about.cta.eyebrow')} title={t('about.cta.title')} />
          <p className="lede mx-auto mt-4 max-w-[40ch]">{t('about.cta.lede')}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="btn-primary w-full sm:w-auto">
              Get in Touch
            </Link>
            <a href={`mailto:${site.email}`} className="btn-ghost w-full sm:w-auto">
              {site.email}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
