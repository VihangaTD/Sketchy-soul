import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { JsonLd } from '@/components/JsonLd';
import { getFaqs } from '@/lib/cms/editorial';
import { copy, getCopy } from '@/lib/cms/copy';
import { breadcrumbSchema, faqSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers on reference photos, turnaround times, international shipping, revisions, refunds, payment security and copyright for custom hand-drawn portrait commissions.',
  path: '/faq',
  ownOgImage: true,
  keywords: ['portrait commission FAQ', 'portrait artist questions', 'commission refund policy'],
});

export default async function FaqPage() {
  const [faqs, blocks] = await Promise.all([getFaqs(), getCopy()]);
  const t = (key: string) => copy(blocks, key);

  return (
    <>
      {/* FAQPage structured data is what produces the expandable Q&A rows
          under your listing in Google. */}
      <JsonLd
        data={[
          faqSchema(faqs),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'FAQ', path: '/faq' },
          ]),
        ]}
      />

      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('faq.hero.eyebrow')}
            title={t('faq.hero.title')}
            lede={t('faq.hero.lede')}
          />
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="shell mx-auto max-w-3xl">
          <div className="border-t border-hairline">
            {faqs.map((faq, i) => (
              <details
                key={faq.question}
                className="group border-b border-hairline"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 marker:hidden">
                  <h2 className="font-sans text-[14.5px] font-medium leading-snug text-ivory">
                    {faq.question}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 font-serif text-[22px] leading-none text-gold transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-6 text-[13px] leading-relaxed text-grey">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-14 text-center">
            <h2 className="heading">{t('faq.cta.title')}</h2>
            <p className="lede mx-auto mt-3 max-w-[40ch]">{t('faq.cta.lede')}</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contact" className="btn-primary w-full sm:w-auto">
                Ask a Question
              </Link>
              <Link href="/packages" className="btn-ghost w-full sm:w-auto">
                Choose a Package
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
