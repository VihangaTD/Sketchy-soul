import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { PackageCards } from '@/components/PackageCards';
import { JsonLd } from '@/components/JsonLd';
import { formatMoney } from '@/lib/packages';
import { getCatalogue } from '@/lib/cms/catalogue';
import { getFaqs } from '@/lib/cms/editorial';
import { copy, getCopy } from '@/lib/cms/copy';
import { gridColumns } from '@/lib/layout';
import { breadcrumbSchema, faqSchema, packagesSchema, pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Packages & Pricing — Custom Portrait Commissions',
  description:
    'Transparent portrait pricing from $85. A5 to A2 sizes, graphite, charcoal or colour pencil, with framing, rush delivery and extra subjects available as add-ons.',
  path: '/packages',
  ownOgImage: true,
  keywords: [
    'portrait commission prices',
    'how much does a custom portrait cost',
    'pencil portrait pricing',
    'commission a drawing from photo price',
  ],
});

/** Which questions earn their own structured data on this page. */
const PRICING_TOPICS = [
  'long does a portrait take',
  'ship internationally',
  'payment secure',
  'more than one person',
];

export default async function PackagesPage() {
  const [catalogue, faqs, blocks] = await Promise.all([getCatalogue(), getFaqs(), getCopy()]);
  const t = (key: string) => copy(blocks, key);

  const pricingFaqs = faqs.filter((f) =>
    PRICING_TOPICS.some((needle) => f.question.toLowerCase().includes(needle)),
  );

  return (
    <>
      <JsonLd
        data={[
          packagesSchema(catalogue),
          faqSchema(pricingFaqs),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Packages', path: '/packages' },
          ]),
        ]}
      />

      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={t('packages.hero.eyebrow')}
            title={t('packages.hero.title')}
            lede={t('packages.hero.lede')}
          />
        </div>
      </section>

      {/* ── The four packages ────────────────────────────────────────────── */}
      <section className="pb-16 sm:pb-20">
        <div className="shell">
          <PackageCards packages={catalogue.packages} detailed />
        </div>
      </section>

      {/* ── Medium ───────────────────────────────────────────────────────── */}
      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <SectionHead eyebrow={t('packages.medium.eyebrow')} title={t('packages.medium.title')} />
          <div className={`mt-10 grid grid-cols-1 gap-6 ${gridColumns(catalogue.styles.length, 3)}`}>
            {catalogue.styles.map((style) => (
              <div key={style.id} className="panel p-6 text-center">
                <h3 className="subheading">{style.name}</h3>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-grey">
                  {style.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Add-ons ──────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow={t('packages.extras.eyebrow')}
            title={t('packages.extras.title')}
            lede={t('packages.extras.lede')}
          />

          <div className="mx-auto mt-10 max-w-3xl">
            <ul className="divide-y divide-[rgba(255,255,255,0.08)] border-y border-hairline">
              {catalogue.addOns.map((addOn) => (
                <li key={addOn.id} className="flex items-start justify-between gap-3 py-5 sm:gap-6">
                  <div className="min-w-0 break-words">
                    <p className="font-sans text-[14px] font-medium text-ivory">{addOn.name}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-grey">
                      {addOn.description}
                    </p>
                  </div>
                  <p className="shrink-0 font-serif text-[20px] text-gold-soft">
                    +{formatMoney(addOn.price)}
                  </p>
                </li>
              ))}
              <li className="flex items-start justify-between gap-3 py-5 sm:gap-6">
                <div className="min-w-0 break-words">
                  <p className="font-sans text-[14px] font-medium text-ivory">
                    {t('packages.extras.subjectTitle')}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-grey">
                    {t('packages.extras.subjectBody')}
                  </p>
                </div>
                <p className="shrink-0 font-serif text-[20px] text-gold-soft">
                  +{formatMoney(catalogue.extraSubjectPrice)}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Delivery ─────────────────────────────────────────────────────── */}
      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <SectionHead eyebrow={t('packages.delivery.eyebrow')} title={t('packages.delivery.title')} />
          <div className={`mt-10 grid grid-cols-1 gap-6 ${gridColumns(catalogue.deliveryOptions.length, 3)}`}>
            {catalogue.deliveryOptions.map((option) => (
              <div key={option.id} className="panel flex flex-col p-6">
                <p className="eyebrow mb-2">
                  {option.price === 0 ? 'Included' : `+${formatMoney(option.price)}`}
                </p>
                <h3 className="subheading">{option.name}</h3>
                <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-grey">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-grey">
            Import duties and local taxes in the destination country are the
            recipient&apos;s responsibility.{' '}
            <Link href="/shipping" className="text-gold-soft underline-offset-4 hover:underline">
              Shipping &amp; returns policy
            </Link>
          </p>
        </div>
      </section>

      {/* ── Comparison table (desktop) ───────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHead eyebrow={t('packages.compare.eyebrow')} title={t('packages.compare.title')} />

          <div className="mt-8 grid grid-cols-1 gap-4 md:hidden">
            {catalogue.packages.map((pkg) => (
              <article key={pkg.id} className="panel min-w-0 break-words p-5">
                <h3 className="subheading">{pkg.name}</h3>
                <dl className="mt-4 space-y-3 text-[13px]">
                  {[
                    ['Size', pkg.size],
                    ['Subjects', `Up to ${pkg.subjectsIncluded}`],
                    ['Turnaround', pkg.turnaround],
                    ['Price', formatMoney(pkg.price)],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-2 gap-3">
                      <dt className="text-grey">{label}</dt>
                      <dd className="text-right text-ivory">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Link href={`/order?package=${pkg.id}`} className="btn-ghost mt-5 w-full px-3">
                  Choose {pkg.sizeShort}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">
                Portrait package comparison: size, price, subjects and turnaround
              </caption>
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="py-4 pr-4 text-[11px] uppercase tracking-[0.16em] text-grey">
                    Package
                  </th>
                  <th scope="col" className="py-4 pr-4 text-[11px] uppercase tracking-[0.16em] text-grey">
                    Size
                  </th>
                  <th scope="col" className="py-4 pr-4 text-[11px] uppercase tracking-[0.16em] text-grey">
                    Subjects
                  </th>
                  <th scope="col" className="py-4 pr-4 text-[11px] uppercase tracking-[0.16em] text-grey">
                    Turnaround
                  </th>
                  <th scope="col" className="py-4 pr-4 text-right text-[11px] uppercase tracking-[0.16em] text-grey">
                    Price
                  </th>
                  <th scope="col" className="py-4 text-right">
                    <span className="sr-only">Order</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {catalogue.packages.map((pkg) => (
                  <tr key={pkg.id} id={pkg.slug} className="border-b border-hairline">
                    <th scope="row" className="py-5 pr-4 font-serif text-[18px] font-medium text-ivory">
                      {pkg.name}
                    </th>
                    <td className="py-5 pr-4 text-[13px] text-grey">{pkg.size}</td>
                    <td className="py-5 pr-4 text-[13px] text-grey">
                      Up to {pkg.subjectsIncluded}
                    </td>
                    <td className="py-5 pr-4 text-[13px] text-grey">{pkg.turnaround}</td>
                    <td className="py-5 pr-4 text-right font-serif text-[20px] text-gold-soft">
                      {formatMoney(pkg.price)}
                    </td>
                    <td className="py-5 text-right">
                      <Link href={`/order?package=${pkg.id}`} className="btn-ghost btn-sm">
                        Choose
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-gold-wash-b section text-center">
        <div className="shell">
          <SectionHead eyebrow={t('packages.cta.eyebrow')} title={t('packages.cta.title')} />
          <p className="lede mx-auto mt-4 max-w-[40ch]">{t('packages.cta.lede')}</p>
          {/* No "choose a package" button here — the package cards above are
              the way in. This section only handles the not-sure-yet case. */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/contact?subject=custom-quote"
              className="btn-ghost w-full sm:w-auto"
            >
              Ask for a Custom Quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
