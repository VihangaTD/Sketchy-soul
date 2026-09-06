import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { OrderWizard } from '@/components/order/OrderWizard';
import { JsonLd } from '@/components/JsonLd';
import { defaultPackageId, getPackage, getPackageBySlug } from '@/lib/packages';
import { getCatalogue } from '@/lib/cms/catalogue';
import { copy, getCopy } from '@/lib/cms/copy';
import { isStripeConfigured } from '@/lib/stripe';
import { isPayPalConfigured } from '@/lib/paypal';
import { breadcrumbSchema, pageMetadata } from '@/lib/seo';

/**
 * The order form.
 *
 * ── CACHING ─────────────────────────────────────────────────────────────────
 * `force-dynamic` because which payment buttons appear depends on which
 * provider keys are present in the environment at request time. Everything the
 * visitor types stays in their browser until they press pay.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Start Your Portrait',
  description:
    'Choose a size, upload your photo and order a hand-drawn portrait in a few minutes. Secure payment by card or PayPal, preview sketch before rendering.',
  path: '/order',
  // A half-filled checkout is not a landing page — keep it out of the index
  // but let link equity flow through it.
  noIndex: true,
});

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const [params, catalogue, blocks] = await Promise.all([
    searchParams,
    getCatalogue(),
    getCopy(),
  ]);

  // ?package=a3-heirloom (id) or ?package=a3-heirloom-portrait (slug)
  const requested = params.package ?? '';
  const initialPackage =
    getPackage(catalogue, requested)?.id ??
    getPackageBySlug(catalogue, requested)?.id ??
    defaultPackageId(catalogue);

  // Arriving here means a package has just been picked, so the eyebrow names
  // it back to the visitor rather than repeating the heading.
  const chosen = getPackage(catalogue, initialPackage);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Order', path: '/order' },
        ])}
      />

      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <SectionHead
            as="h1"
            eyebrow={chosen ? `${chosen.sizeShort} · ${chosen.name}` : 'Your Portrait'}
            title={copy(blocks, 'order.hero.title')}
            lede={copy(blocks, 'order.hero.lede')}
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="shell">
          <OrderWizard
            catalogue={catalogue}
            initialPackageId={initialPackage}
            stripeEnabled={isStripeConfigured()}
            paypalEnabled={isPayPalConfigured()}
          />
        </div>
      </section>
    </>
  );
}
