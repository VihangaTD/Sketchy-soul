import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { OrderStatus, type Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { isSafePhotoUrl, orderPhotos } from '@/lib/orders';
import { formatMoney } from '@/lib/packages';
import { isSheetsConfigured } from '@/lib/google-sheets';
import { isFormConfigured } from '@/lib/google-form';
import { isStripeConfigured, isStripeTestMode } from '@/lib/stripe';
import { isPayPalConfigured, isPayPalSandbox } from '@/lib/paypal';
import { isCloudinaryConfigured } from '@/lib/storage';
import { isCatalogueSeeded } from '@/lib/cms/catalogue';
import { requireAdmin } from '@/lib/admin/guard';
import { SectionHead } from '@/components/SectionHead';
import { reconcileStripeOrder } from '@/lib/stripe-orders';
import { ShippingForm } from '@/components/admin/ShippingForm';
import { DigitalDeliveryForm } from '@/components/admin/DigitalDeliveryForm';
import { OrderLimitSelect } from '@/components/admin/OrderLimitSelect';
import { OrderFilters } from '@/components/admin/OrderFilters';

/**
 * Private order dashboard.
 *
 * The Google Sheet remains your day-to-day workbook — this page exists for the
 * things a sheet cannot do: see orders that never reached the sheet
 * and confirm at a glance that the live configuration is correct.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Studio Orders',
  robots: { index: false, follow: false },
};

async function checkStripePayment(formData: FormData) {
  'use server';
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: String(formData.get('orderId') ?? '') } });
  let result = 'unavailable';
  if (order?.provider === 'STRIPE') {
    try {
      const verified = await reconcileStripeOrder(order);
      result = verified.status === 'PAID' ? 'paid' : 'pending';
    } catch {
      console.error('[stripe] Admin payment verification failed.');
    }
  }
  revalidatePath('/admin');
  redirect(`/admin?paymentCheck=${result}`);
}

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ paymentCheck?: string; limit?: string; type?: string; payment?: string; delivery?: string }>;
}) {
  const { paymentCheck, limit, type, payment, delivery } = await searchParams;
  const selectedType = ['rolled', 'digital', 'framed'].includes(type ?? '') ? type! : 'all';
  const selectedPayment = Object.values(OrderStatus).includes(payment as OrderStatus) ? payment as OrderStatus : 'all';
  const selectedDelivery = ['pending', 'shipped', 'link_sent'].includes(delivery ?? '') ? delivery! : 'all';
  const conditions: Prisma.OrderWhereInput[] = [];
  if (selectedType !== 'all') conditions.push({ deliveryType: selectedType });
  if (selectedPayment !== 'all') conditions.push({ status: selectedPayment });
  if (selectedDelivery !== 'all') {
    conditions.push({ status: 'PAID' });
    if (selectedDelivery === 'shipped') conditions.push({ deliveryType: 'rolled', shipmentEmailSentAt: { not: null } });
    else if (selectedDelivery === 'link_sent') conditions.push({ deliveryType: 'digital', digitalEmailSentAt: { not: null } });
    else conditions.push({ OR: [
      { deliveryType: 'digital', digitalEmailSentAt: null },
      { deliveryType: 'rolled', shipmentEmailSentAt: null },
      { deliveryType: 'framed', shipmentEmailSentAt: null },
    ] });
  }
  const requestedLimit = Number(limit);
  const orderLimit = [10, 25, 50, 100].includes(requestedLimit) ? requestedLimit : 50;
  const checkMessage = paymentCheck === 'paid'
    ? 'Stripe confirmed payment. The order is now marked paid.'
    : paymentCheck === 'pending'
      ? 'Stripe has not confirmed a completed payment for this order.'
      : paymentCheck === 'unavailable'
        ? 'Could not verify payment with Stripe. Check your server configuration and try again.'
        : null;
  const now = new Date();
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = Number(localDate.find((part) => part.type === 'year')!.value);
  const month = Number(localDate.find((part) => part.type === 'month')!.value);
  // Sri Lanka uses UTC+05:30 throughout the year.
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 330 * 60_000);
  const nextMonthStart = new Date(Date.UTC(year, month, 1) - 330 * 60_000);
  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', month: 'long', year: 'numeric',
  }).format(now);
  const [orders, counts, seeded, revenueTotals] = await Promise.all([
    prisma.order.findMany({
      where: { AND: conditions },
      orderBy: { createdAt: 'desc' },
      take: orderLimit,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    isCatalogueSeeded().catch(() => true),
    prisma.$queryRaw<{ allTime: bigint; monthly: bigint }[]>`
      SELECT
        COALESCE(SUM(COALESCE("amountPaid", "total")), 0)::bigint AS "allTime",
        COALESCE(SUM(CASE WHEN "paidAt" >= ${monthStart} AND "paidAt" < ${nextMonthStart}
          THEN COALESCE("amountPaid", "total") ELSE 0 END), 0)::bigint AS "monthly"
      FROM "Order" WHERE "status" = 'PAID'
    `,
  ]);

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  // What was actually captured, which a Stripe promotion code makes smaller
  // than the list total.
  const revenue = paidOrders.reduce((sum, o) => sum + (o.amountPaid ?? o.total), 0);
  const countOf = (status: string) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;

  const warnings = [
    isStripeConfigured() && !process.env.STRIPE_WEBHOOK_SECRET && 'Stripe webhook secret is missing. Automatic payment confirmations will fail.',
    !isCloudinaryConfigured() && 'Cloudinary is not connected — uploads will fail in production.',
    !isSheetsConfigured() && !isFormConfigured() && 'No Google hand-off configured — paid orders will not reach a sheet.',
    !isStripeConfigured() && !isPayPalConfigured() && 'No payment provider configured — nobody can check out.',
    isStripeConfigured() && isStripeTestMode() && 'Stripe is in TEST mode — no real money is being taken.',
    isPayPalConfigured() && isPayPalSandbox() && 'PayPal is in SANDBOX mode — no real money is being taken.',
    !seeded &&
      'Content tables are empty — the site is rendering the defaults from code. Run `npm run db:seed` once to make packages, gallery and copy editable here.',
  ].filter(Boolean) as string[];

  return (
    <section className="section">
      <div className="shell">
        <SectionHead as="h1" align="left" eyebrow="Studio Only" title="Orders" />
        {checkMessage ? <p role="status" className="mt-6 text-sm text-gold-soft">{checkMessage}</p> : null}

        {warnings.length > 0 ? (
          <ul className="mt-8 space-y-2">
            {warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-[2px] border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-gold-soft"
              >
                {warning}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
          <Stat label="All-time revenue" value={formatMoney(Number(revenueTotals[0]?.allTime ?? 0))} />
          <Stat label={`Revenue · ${monthLabel}`} value={formatMoney(Number(revenueTotals[0]?.monthly ?? 0))} />
          <Stat label="All paid orders" value={String(countOf('PAID'))} />
        </div>
        {/* <p className="mt-3 text-xs text-grey">Revenue includes paid orders at the amount captured. Monthly revenue uses the payment date in Sri Lanka time.</p> */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-4">
          <Stat label="Total orders" value={String(counts.reduce((total, group) => total + group._count._all, 0))} />
          <Stat label="Paid (shown orders)" value={String(paidOrders.length)} />
          <Stat label="Revenue (shown orders)" value={formatMoney(revenue)} />
          <Stat label="Awaiting payment" value={String(countOf('AWAITING_PAYMENT'))} />
        </div>

        <div className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl text-ivory">Recent orders</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="order-limit" className="text-xs text-grey">Show last</label>
              <OrderLimitSelect limit={orderLimit} />
              <span className="text-xs text-grey">Showing {orders.length} · Newest first</span>
            </div>
          </div>
          <OrderFilters type={selectedType} payment={selectedPayment} delivery={selectedDelivery} />
          <div className="space-y-3">
              {orders.map((order) => {
                const photos = orderPhotos(order);
                const deliverySent = order.deliveryType === 'digital'
                  ? Boolean(order.digitalEmailSentAt) : Boolean(order.shipmentEmailSentAt);
                const deliveryStatus = deliverySent
                  ? order.deliveryType === 'digital' ? 'Link sent' : 'Shipped'
                  : order.deliveryType === 'digital' ? 'Awaiting digital delivery' : 'Awaiting shipment';

                return (
                  <details key={order.id} className="group/order overflow-hidden rounded-lg border border-hairline bg-white/[0.02] open:border-gold/30">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-gold sm:gap-5 sm:px-6 [&::-webkit-details-marker]:hidden">
                      <span className="shrink-0 font-mono text-xs text-ivory sm:text-sm">{order.reference}</span>
                      <span className="hidden min-w-0 flex-1 truncate text-xs text-grey lg:block">{order.packageName}</span>
                      <span className="hidden shrink-0 text-xs capitalize text-grey md:block">{order.deliveryType}</span>
                      <span className="shrink-0"><StatusPill status={order.status} /></span>
                      {order.status === 'PAID' ? (
                        <span title="Delivery status" className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${deliverySent ? 'border-gold/40 bg-gold/10 text-gold-soft' : 'border-hairline text-grey'}`}>
                          {deliveryStatus}
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 text-right text-sm text-gold-soft">{formatMoney(order.amountPaid ?? order.total)}</span>
                    </summary>
                    <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 border-t border-hairline p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4 [&>div]:min-w-0 [&>div]:break-words">
                    <div className="text-[12px] text-grey sm:col-span-2 xl:col-span-1">
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Created · UTC</span>
                      {order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </div>
                    <div className="font-mono text-sm text-ivory">
                      <span className="mb-2 block font-sans text-[10px] uppercase tracking-widest text-grey">Order reference</span>
                      {order.reference}
                    </div>
                    <div>
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Payment status</span>
                      <StatusPill status={order.status} />
                      {order.provider === 'STRIPE' && order.status === 'AWAITING_PAYMENT' ? (
                        <form action={checkStripePayment} className="mt-2">
                          <input type="hidden" name="orderId" value={order.id} />
                          <button type="submit" className="text-[11px] text-gold hover:text-gold-soft">Check Stripe payment</button>
                        </form>
                      ) : null}
                    </div>
                    <div className="text-[12.5px] sm:row-span-2">
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Customer</span>
                      <span className="block text-ivory">{order.customerName}</span>
                      <a
                        href={`mailto:${order.customerEmail}`}
                        className="break-all text-gold-soft hover:underline"
                      >
                        {order.customerEmail}
                      </a>
                      <span className="mt-0.5 block text-[11px] text-grey/70">{order.country}</span>
                      <details className="mt-2 max-w-[280px] text-[12px] text-grey">
                        <summary className="cursor-pointer text-gold">Customer details</summary>
                        <dl className="mt-2 space-y-2">
                          <div><dt className="text-ivory">Phone</dt><dd>{order.customerPhone || 'Not provided'}</dd></div>
                          <div><dt className="text-ivory">Shipping address</dt><dd className="whitespace-pre-line">{[order.addressLine1, order.addressLine2, order.city, order.postalCode].filter(Boolean).length
                            ? [order.addressLine1, order.addressLine2, order.city, order.postalCode, order.country].filter(Boolean).join('\n')
                            : order.deliveryType === 'digital' ? 'Not collected for digital delivery.' : 'Not provided'}</dd></div>
                          <div><dt className="text-ivory">Occasion</dt><dd>{order.occasion || 'Not provided'}</dd></div>
                          <div><dt className="text-ivory">Deadline</dt><dd>{order.deadline || 'Not provided'}</dd></div>
                          <div><dt className="text-ivory">Notes</dt><dd className="whitespace-pre-wrap break-words">{order.notes || 'None'}</dd></div>
                          <div><dt className="text-ivory">Portfolio permission</dt><dd>{order.consented ? 'Yes' : 'No'}</dd></div>
                        </dl>
                      </details>
                    </div>
                    <div className="text-[12.5px] text-grey">
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Portrait</span>
                      <span className="block text-ivory">{order.packageName}</span>
                      {order.packageSize} · {order.style} · {order.subjects} subj ·{' '}
                      {order.deliveryType}
                    </div>
                    <div className="text-lg text-gold-soft">
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Total</span>
                      {formatMoney(order.amountPaid ?? order.total)}
                      {/* A promotion code makes the captured amount differ
                          from the list price — show both so the sheet and the
                          Stripe payout can be reconciled without guessing. */}
                      {order.amountPaid != null && order.amountPaid !== order.total ? (
                        <span className="mt-0.5 block text-[10.5px] text-grey line-through">
                          {formatMoney(order.total)}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[10.5px] text-grey">
                        {order.provider ?? '—'}
                      </span>
                    </div>
                    <div className="text-[12px]">
                      <span className="mb-2 block text-[10px] uppercase tracking-widest text-grey">Reference photos</span>
                      {photos.length === 0 ? (
                        <span className="text-grey">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {photos.map((photo, i) =>
                            // Only a URL our own storage could have issued is
                            // turned into something clickable. Anything else is
                            // shown as plain text so a bad row cannot run in
                            // the one session that can edit the whole site.
                            isSafePhotoUrl(photo.url) ? (
                              <a
                                key={photo.pathname}
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="rounded border border-hairline px-3 py-2 text-gold hover:border-gold/50 hover:text-gold-soft"
                              >
                                Photo {i + 1}
                              </a>
                            ) : (
                              <span
                                key={photo.pathname}
                                title={photo.url}
                                className="text-[#e08b84]"
                              >
                                Photo {i + 1} — unrecognised source
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded border border-hairline bg-black/20 p-4 text-[12px] sm:col-span-2 xl:col-span-4">
                      <span className="mb-3 block text-[10px] uppercase tracking-widest text-grey">Delivery · {order.deliveryType}</span>
                      {order.deliveryType === 'rolled' && order.status === 'PAID' ? (
                        <ShippingForm orderId={order.id} trackingNumber={order.trackingNumber} downloadUrl={order.digitalDownloadUrl}
                          sentAt={order.shipmentEmailSentAt?.toISOString() ?? null} />
                      ) : order.deliveryType === 'digital' && order.status === 'PAID' ? (
                        <DigitalDeliveryForm orderId={order.id} downloadUrl={order.digitalDownloadUrl}
                          sentAt={order.digitalEmailSentAt?.toISOString() ?? null} />
                      ) : <span className="text-grey">{order.status !== 'PAID' ? 'Delivery controls become available after payment is confirmed.' : 'Contact the customer to arrange framed delivery.'}</span>}
                    </div>
                    </div>
                  </details>
                );
              })}
          </div>

          {orders.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-grey">
              No orders match these filters. Try a different delivery type, payment status, or delivery status.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel min-w-0 p-3 sm:p-5">
      <p className="text-[9px] uppercase leading-relaxed tracking-[0.08em] text-grey sm:text-[10.5px] sm:tracking-[0.14em]">{label}</p>
      <p className="mt-1 break-words font-serif text-xl leading-tight text-ivory sm:mt-2 sm:text-[26px]">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'PAID'
      ? 'border-gold text-gold-soft'
      : status === 'AWAITING_PAYMENT'
        ? 'border-hairline text-grey'
        : status === 'FAILED' || status === 'REFUNDED'
          ? 'border-[#c2564f]/50 text-[#e08b84]'
          : 'border-hairline text-grey/70';

  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
