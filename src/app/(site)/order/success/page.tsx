import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

import { SectionHead } from '@/components/SectionHead';
import { PaymentPending } from '@/components/order/PaymentPending';
import { PurchaseTracking } from '@/components/order/PurchaseTracking';
import { SketchPortrait } from '@/components/SketchPortrait';
import { prisma } from '@/lib/prisma';
import { orderPhotos } from '@/lib/orders';
import { formatMoney } from '@/lib/packages';
import { COOKIES } from '@/lib/cookies';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

/** Never cached and never indexed — it shows one specific customer's order. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Order Confirmed',
  description: 'Your portrait order has been received.',
  path: '/order/success',
  noIndex: true,
});

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();

  /**
   * The reference alone is NOT proof of ownership.
   *
   * It travels in a URL, so it ends up in browser history, in support emails
   * and in anything the customer pastes — and this page renders their email
   * address, their package and what they paid. Looking an order up on the
   * query string alone let anyone holding (or guessing) a reference read
   * somebody else's details.
   *
   * `ss_last_order` is the httpOnly cookie /api/checkout sets on the browser
   * that actually placed the order. It is SameSite=Lax, so it survives the
   * top-level redirect back from Stripe and PayPal. Only when it matches do
   * the personal details render; everyone else gets the generic confirmation
   * below, which gives nothing away.
   */
  const ownedReference = jar.get(COOKIES.lastOrder)?.value ?? null;
  const requested = params.ref ?? ownedReference;
  const reference = requested && requested === ownedReference ? requested : null;

  const order = reference
    ? await prisma.order.findUnique({ where: { reference } }).catch(() => null)
    : null;

  const paid = order?.status === 'PAID';

  return (
    <section className="section bg-gold-wash">
      <div className="shell mx-auto max-w-2xl text-center">
        <SketchPortrait variant={1} className="mx-auto mb-6 h-24 w-24" />

        <SectionHead
          as="h1"
          eyebrow={paid ? 'Payment Received' : 'Almost There'}
          title={paid ? 'Your portrait is in the queue.' : 'Thank you'}
        />

        {order ? (
          <>
            {paid ? (
              <PurchaseTracking
                reference={order.reference}
                value={order.amountPaid ?? order.total}
                packageId={order.packageId}
                packageName={order.packageName}
              />
            ) : null}

            <p className="lede mx-auto mt-5 max-w-[44ch]">
              {paid ? (
                <>
                  A confirmation is on its way to{' '}
                  <span className="text-ivory">{order.customerEmail}</span>. Your
                  preview sketch will follow within {site.turnaround.preview}.
                </>
              ) : (
                <>
                  We are waiting for your payment provider to confirm the
                  transaction.
                </>
              )}
            </p>

            <div className="panel mx-auto mt-8 max-w-md divide-y divide-[rgba(255,255,255,0.08)] text-left">
              <Row label="Reference" value={order.reference} mono />
              <Row label="Package" value={`${order.packageName} · ${order.packageSize}`} />
              {/* No subject count: the order form no longer asks for one, so
                  every order would read "1" whatever is in the photographs. */}
              <Row label="Reference photos" value={`${orderPhotos(order).length} received`} />
              <Row label="Total" value={formatMoney(order.amountPaid ?? order.total)} />
            </div>

            {!paid ? (
              <div className="mx-auto mt-6 max-w-md">
                <PaymentPending reference={order.reference} />
              </div>
            ) : null}

            <div className="mx-auto mt-8 max-w-md text-left">
              <p className="eyebrow mb-3">What happens next</p>
              <ol className="space-y-3 text-[13px] leading-relaxed text-grey">
                <li>
                  <span className="mr-2 text-gold">01</span>
                  The studio reviews your photographs, usually the same day.
                </li>
                <li>
                  <span className="mr-2 text-gold">02</span>
                  A preview sketch arrives by email within {site.turnaround.preview}.
                </li>
                <li>
                  <span className="mr-2 text-gold">03</span>
                  You approve it — or ask for changes — and rendering begins.
                </li>
              </ol>
            </div>
          </>
        ) : (
          <p className="lede mx-auto mt-5 max-w-[44ch]">
            Your payment went through. If you cannot see your order reference
            here, check your email — or send us a note and we will find it
            straight away.
          </p>
        )}

        <p className="mt-8 text-[12px] leading-relaxed text-grey">
          Forgot to mention something? Reply to your confirmation email or write
          to{' '}
          <a href={`mailto:${site.email}`} className="text-gold-soft underline-offset-4 hover:underline">
            {site.email}
          </a>
          {order ? (
            <>
              {' '}
              quoting <span className="text-ivory">{order.reference}</span>
            </>
          ) : null}
          .
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/gallery" className="btn-ghost w-full sm:w-auto">
            Browse the Gallery
          </Link>
          <Link href="/" className="btn-primary w-full sm:w-auto">
            Back to the Studio
          </Link>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</span>
      <span className={`text-right text-[13px] text-ivory ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
