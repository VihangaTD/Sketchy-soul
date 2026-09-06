import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { ArtFrame } from '@/components/ArtFrame';
import { JsonLd } from '@/components/JsonLd';
import { getProcessSteps } from '@/lib/cms/editorial';
import { copy, getCopy } from '@/lib/cms/copy';
import { site } from '@/lib/site';
import { breadcrumbSchema, howToSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'How It Works — From Your Photo to a Finished Portrait',
  description:
    'The five-step commission process: upload a photo, choose size and medium, approve a preview sketch, request revisions, and receive your portrait framed, rolled or digitally.',
  path: '/process',
  ownOgImage: true,
  keywords: [
    'how to commission a portrait',
    'custom portrait process',
    'portrait commission steps',
    'what photo to send portrait artist',
  ],
});

const PHOTO_TIPS = {
  good: [
    'Taken in daylight, ideally near a window',
    'Face sharp and filling a decent part of the frame',
    'Eyes open and clearly visible',
    'The original file, not a screenshot of a screenshot',
    'Several angles of the same person if you have them',
  ],
  avoid: [
    'Heavy filters or beauty smoothing',
    'Direct flash that flattens every shadow',
    'Sunglasses, deep hat shadow or motion blur',
    'Tiny thumbnails pulled from social media',
    'Group photos where the face is only a few pixels wide',
  ],
};

export default async function ProcessPage() {
  const [steps, blocks] = await Promise.all([getProcessSteps(), getCopy()]);
  const t = (key: string) => copy(blocks, key);

  return (
    <>
      <JsonLd
        data={[
          howToSchema(steps),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Process', path: '/process' },
          ]),
        ]}
      />

      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('process.hero.eyebrow')}
            title={t('process.hero.title')}
            lede={t('process.hero.lede')}
          />
        </div>
      </section>

      {/* ── Long-form steps, alternating with artwork ─────────────────────── */}
      <section className="pb-8">
        <div className="shell space-y-16 sm:space-y-24">
          {steps.map((step, i) => (
            <article
              key={step.num}
              id={`step-${i + 1}`}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="font-serif text-[46px] leading-none text-gold sm:text-[64px]">
                  {step.num}
                </p>
                <span className="mt-4 block h-px w-12 bg-gradient-to-r from-gold to-transparent" />
                <h2 className="heading mt-5">{step.title}</h2>
                <p className="lede mt-4 max-w-[46ch]">{step.body}</p>

                {i === 0 ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-grey">
                    You can upload up to five reference photos. More angles means
                    a better likeness — send everything you have.
                  </p>
                ) : null}
                {i === 2 ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-grey">
                    Preview sketches arrive within {site.turnaround.preview}. If
                    the likeness cannot be resolved at this stage, you are
                    refunded in full.
                  </p>
                ) : null}
              </div>

              {/* One photo per step, chosen at /admin/pages → Process page. An
                  empty slot falls through to the built-in line portrait, so
                  the page reads as finished however many have been taken. */}
              <ArtFrame
                src={t(`process.step.${i + 1}.image.url`) || undefined}
                alt={t(`process.step.${i + 1}.image.alt`)}
                sketch={((i % 3) + 1) as 1 | 2 | 3}
                ratio="aspect-[4/5] lg:aspect-[5/4]"
                sizes="(max-width: 1024px) 90vw, 45vw"
                className={i % 2 === 1 ? 'lg:order-1' : ''}
              />
            </article>
          ))}
        </div>
      </section>

      {/* ── Photo guidance ───────────────────────────────────────────────── */}
      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <SectionHead
            eyebrow="Reference Photos"
            title="What Makes a Good Photo"
            lede="A drawing can only be as good as what it is drawn from. Two minutes here saves a week later."
          />

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="panel p-6">
              <p className="eyebrow mb-4">Send this</p>
              <ul className="space-y-3">
                {PHOTO_TIPS.good.map((tip) => (
                  <li key={tip} className="flex gap-3 text-[13px] leading-relaxed text-grey">
                    <span aria-hidden="true" className="mt-[9px] h-px w-3 shrink-0 bg-gold" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel p-6">
              <p className="eyebrow mb-4 !text-grey">Avoid if you can</p>
              <ul className="space-y-3">
                {PHOTO_TIPS.avoid.map((tip) => (
                  <li key={tip} className="flex gap-3 text-[13px] leading-relaxed text-grey">
                    <span aria-hidden="true" className="mt-[9px] h-px w-3 shrink-0 bg-grey/50" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center text-[12.5px] text-grey">
            Not sure if your photo will work?{' '}
            <Link href="/contact" className="text-gold-soft underline-offset-4 hover:underline">
              Send it over first
            </Link>{' '}
            — you will get an honest answer before you pay.
          </p>
        </div>
      </section>

      {/* ── Timeline summary ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHead eyebrow="Timings" title="What to Expect, When" />
          <dl className="mx-auto mt-10 max-w-2xl divide-y divide-[rgba(255,255,255,0.08)] border-y border-hairline">
            {[
              ['Order confirmed', 'Instantly, with your reference number by email'],
              ['Preview sketch', site.turnaround.preview],
              ['Finished portrait', `${site.turnaround.standard} (rush: ${site.turnaround.rush})`],
              ['Shipping', '3–10 days worldwide, tracked'],
              ['Digital delivery', 'Same day as completion'],
            ].map(([term, detail]) => (
              <div key={term} className="flex items-baseline justify-between gap-6 py-4">
                <dt className="font-sans text-[13.5px] text-ivory">{term}</dt>
                <dd className="text-right text-[12.5px] text-grey">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 text-center">
            <Link href="/packages" className="btn-primary">
              Choose a Package
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
