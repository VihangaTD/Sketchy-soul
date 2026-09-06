import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';

import { prisma } from '@/lib/prisma';
import { isSafePhotoUrl, orderPhotos, syncOrderToSheet } from '@/lib/orders';
import { formatMoney } from '@/lib/packages';
import { isSheetsConfigured } from '@/lib/google-sheets';
import { isFormConfigured } from '@/lib/google-form';
import { isStripeConfigured, isStripeTestMode } from '@/lib/stripe';
import { isPayPalConfigured, isPayPalSandbox } from '@/lib/paypal';
import { isCloudinaryConfigured } from '@/lib/storage';
import { isCatalogueSeeded } from '@/lib/cms/catalogue';
import { requireAdmin } from '@/lib/admin/guard';
import { SectionHead } from '@/components/SectionHead';

/**
 * Private order dashboard.
 *
 * The Google Sheet remains your day-to-day workbook — this page exists for the
 * things a sheet cannot do: see orders that never reached the sheet, retry
 * them, and confirm at a glance that the live configuration is correct.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Studio Orders',
  robots: { index: false, follow: false },
};

/** Re-attempts the Google hand-off for one order. */
async function resyncOrder(formData: FormData) {
  'use server';

  // Middleware already guards /admin; this is the belt to its braces, because
  // a server action is a POST endpoint in its own right.
  await requireAdmin();

  const id = String(formData.get('orderId') ?? '');
  const order = await prisma.order.findUnique({ where: { id } });
  if (order) await syncOrderToSheet(order);

  revalidatePath('/admin');
}

export default async function AdminPage() {
  const [orders, counts, failedCount, seeded] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { sheetStatus: 'FAILED' } }),
    isCatalogueSeeded().catch(() => true),
  ]);

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  // What was actually captured, which a Stripe promotion code makes smaller
  // than the list total.
  const revenue = paidOrders.reduce((sum, o) => sum + (o.amountPaid ?? o.total), 0);
  const countOf = (status: string) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;

  const warnings = [
    !isCloudinaryConfigured() && 'Cloudinary is not connected — uploads will fail in production.',
    !isSheetsConfigured() && !isFormConfigured() && 'No Google hand-off configured — paid orders will not reach a sheet.',
    !isStripeConfigured() && !isPayPalConfigured() && 'No payment provider configured — nobody can check out.',
    isStripeConfigured() && isStripeTestMode() && 'Stripe is in TEST mode — no real money is being taken.',
    isPayPalConfigured() && isPayPalSandbox() && 'PayPal is in SANDBOX mode — no real money is being taken.',
    failedCount > 0 && `${failedCount} order${failedCount > 1 ? 's' : ''} failed to reach the sheet — retry below.`,
    !seeded &&
      'Content tables are empty — the site is rendering the defaults from code. Run `npm run db:seed` once to make packages, gallery and copy editable here.',
  ].filter(Boolean) as string[];

  return (
    <section className="section">
      <div className="shell">
        <SectionHead as="h1" align="left" eyebrow="Studio Only" title="Orders" />

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

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Paid (last 50)" value={String(paidOrders.length)} />
          <Stat label="Revenue (last 50)" value={formatMoney(revenue)} />
          <Stat label="Awaiting payment" value={String(countOf('AWAITING_PAYMENT'))} />
          <Stat label="Sheet failures" value={String(failedCount)} />
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline">
                {['Created', 'Reference', 'Status', 'Customer', 'Package', 'Total', 'Photos', 'Sheet'].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="py-3 pr-4 text-[10.5px] uppercase tracking-[0.14em] text-grey"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const photos = orderPhotos(order);

                return (
                  <tr key={order.id} className="border-b border-hairline align-top">
                    <td className="py-4 pr-4 text-[12px] text-grey">
                      {order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-4 pr-4 font-mono text-[12px] text-ivory">
                      {order.reference}
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="py-4 pr-4 text-[12.5px]">
                      <span className="block text-ivory">{order.customerName}</span>
                      <a
                        href={`mailto:${order.customerEmail}`}
                        className="text-grey hover:text-gold-soft"
                      >
                        {order.customerEmail}
                      </a>
                      <span className="mt-0.5 block text-[11px] text-grey/70">{order.country}</span>
                    </td>
                    <td className="py-4 pr-4 text-[12.5px] text-grey">
                      <span className="block text-ivory">{order.packageName}</span>
                      {order.packageSize} · {order.style} · {order.subjects} subj ·{' '}
                      {order.deliveryType}
                    </td>
                    <td className="py-4 pr-4 text-[13px] text-gold-soft">
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
                    </td>
                    <td className="py-4 pr-4 text-[12px]">
                      {photos.length === 0 ? (
                        <span className="text-grey">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
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
                                className="text-gold hover:text-gold-soft"
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
                    </td>
                    <td className="py-4 text-[12px]">
                      <span
                        className={
                          order.sheetStatus === 'SYNCED'
                            ? 'text-grey'
                            : order.sheetStatus === 'FAILED'
                              ? 'text-[#e08b84]'
                              : 'text-grey/60'
                        }
                      >
                        {order.sheetStatus}
                      </span>

                      {order.status === 'PAID' && order.sheetStatus !== 'SYNCED' ? (
                        <form action={resyncOrder} className="mt-1.5">
                          <input type="hidden" name="orderId" value={order.id} />
                          <button
                            type="submit"
                            className="text-[11px] uppercase tracking-[0.12em] text-gold hover:text-gold-soft"
                          >
                            Retry
                          </button>
                        </form>
                      ) : null}

                      {order.sheetError ? (
                        <p className="mt-1 max-w-[220px] text-[10.5px] leading-snug text-grey/70">
                          {order.sheetError.slice(0, 140)}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {orders.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-grey">
              No orders yet. Place a test order with a Stripe test card
              (4242 4242 4242 4242) to check the whole flow end to end.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-5">
      <p className="text-[10.5px] uppercase tracking-[0.14em] text-grey">{label}</p>
      <p className="mt-2 font-serif text-[26px] text-ivory">{value}</p>
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
