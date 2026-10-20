import { getSiteDetails } from '@/lib/cms/contact';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { ContactForm } from '@/components/ContactForm';
import { Block, Line } from '@/components/Skeleton';
import { JsonLd } from '@/components/JsonLd';
import { copy, getCopy } from '@/lib/cms/copy';
import { breadcrumbSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Contact the Studio',
  description:
    'Questions about a commission, a custom quote or an existing order? Send the studio a message and get an answer, usually within one working day.',
  path: '/contact',
  ownOgImage: true,
  keywords: ['contact portrait artist', 'custom portrait quote', 'commission enquiry'],
});

export default async function ContactPage() {
  const site = await getSiteDetails();
  const blocks = await getCopy();
  const t = (key: string) => copy(blocks, key);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: `Contact ${site.name}`,
            description: 'Get in touch about a portrait commission.',
          },
        ]}
      />

      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('contact.hero.eyebrow')}
            title={t('contact.hero.title')}
            lede={t('contact.hero.lede')}
          />
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="shell grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            {/* The form reads ?subject= from the URL to preselect a topic, so
                it renders on the client. The placeholder is field-shaped
                rather than one grey slab, so nothing moves when it arrives. */}
            <Suspense fallback={<ContactFormSkeleton />}>
              <ContactForm />
            </Suspense>
          </div>

          <aside className="space-y-8 lg:border-l lg:border-hairline lg:pl-12">
            <div>
              <p className="eyebrow mb-3">Direct</p>
              <a
                href={`mailto:${site.email}`}
                className="block font-serif text-[20px] text-ivory transition-colors hover:text-gold-soft"
              >
                {site.email}
              </a>
              {site.phone ? (
                <a
                  href={`tel:${site.phone.replace(/\s/g, '')}`}
                  className="mt-1 block text-[13px] text-grey transition-colors hover:text-gold-soft"
                >
                  {site.phone}
                </a>
              ) : null}
            </div>

            <div>
              <p className="eyebrow mb-3">{t('contact.aside.studioLabel')}</p>
              <p className="text-[13px] leading-relaxed text-grey">
                {t('contact.aside.studioLocation')}
                <br />
                {t('contact.aside.studioNote')}
              </p>
            </div>

            <div>
              <p className="eyebrow mb-3">{t('contact.aside.responseLabel')}</p>
              <p className="text-[13px] leading-relaxed text-grey">
                {t('contact.aside.responseBody')}
              </p>
            </div>

            {site.social.instagram || site.social.whatsapp ? (
              <div>
                <p className="eyebrow mb-3">Elsewhere</p>
                <ul className="space-y-1.5 text-[13px]">
                  {site.social.instagram ? (
                    <li>
                      <a
                        href={site.social.instagram}
                        target="_blank"
                        rel="noreferrer noopener me"
                        className="text-grey transition-colors hover:text-gold-soft"
                      >
                        {t('contact.aside.instagram')}
                      </a>
                    </li>
                  ) : null}
                  {site.social.whatsapp ? (
                    <li>
                      <a
                        href={site.social.whatsapp}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-grey transition-colors hover:text-gold-soft"
                      >
                        {t('contact.aside.whatsapp')}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}

/** Mirrors the real form field for field, so the layout never jumps. */
function ContactFormSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Line className="h-2.5 w-28" />
          <Block className="h-11 w-full" />
        </div>
      ))}
      <div className="space-y-2">
        <Line className="h-2.5 w-28" />
        <Block className="h-32 w-full" />
      </div>
      <Block className="h-11 w-40" />
    </div>
  );
}
