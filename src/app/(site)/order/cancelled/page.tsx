import Link from 'next/link';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Payment Not Completed',
  description: 'Your order was not charged.',
  path: '/order/cancelled',
  noIndex: true,
});

/** Human explanations for the ?reason= codes the PayPal capture route sets. */
const REASONS: Record<string, string> = {
  'missing-token': 'The payment session expired before it could be completed.',
  'order-not-found': 'We could not match that payment to an order.',
  'payment-not-completed': 'Your payment provider did not complete the transaction.',
  'capture-error': 'Something went wrong while confirming the payment.',
};

export default async function CancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const explanation = params.reason ? REASONS[params.reason] : null;

  return (
    <section className="section">
      <div className="shell mx-auto max-w-xl text-center">
        <SectionHead as="h1" eyebrow="No Charge Made" title="Your order is still waiting" />

        <p className="lede mx-auto mt-5 max-w-[42ch]">
          {explanation ?? 'You left the payment page before it completed.'} Nothing
          has been charged, and your answers are still saved in this browser —
          pick up exactly where you left off.
        </p>

        {params.ref ? (
          <p className="mt-4 text-[12px] text-grey">
            Reference <span className="font-mono text-ivory">{params.ref}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/order" className="btn-primary w-full sm:w-auto">
            Return to Checkout
          </Link>
          <Link href="/packages" className="btn-ghost w-full sm:w-auto">
            Review Packages
          </Link>
        </div>

        <p className="mt-8 text-[12px] leading-relaxed text-grey">
          Card declined or the payment page misbehaving? Email{' '}
          <a href={`mailto:${site.email}`} className="text-gold-soft underline-offset-4 hover:underline">
            {site.email}
          </a>{' '}
          and the studio will send you a direct payment link instead.
        </p>
      </div>
    </section>
  );
}
