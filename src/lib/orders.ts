import { randomBytes } from 'node:crypto';
import type { Order } from '@prisma/client';

import { prisma } from './prisma';
import {
  CONTACT_HEADERS,
  CONTACTS_TAB,
  ORDERS_TAB,
  ORDER_HEADERS,
  appendRow,
  isSheetsConfigured,
} from './google-sheets';
import { isFormConfigured, submitToGoogleForm } from './google-form';
import { sendAdminOrderAlert, sendOrderConfirmation } from './email';
import { formatMoney, getDelivery, getStyle } from './packages';
import { getCatalogue } from './cms/catalogue';
import { photoUrlSchema, type UploadedPhoto } from './validation';

/**
 * Order lifecycle: everything that has to happen when money lands.
 * Kept in one place so the Stripe webhook, the PayPal webhook and the PayPal
 * return-URL capture all behave identically.
 */

/* ── Reference codes ─────────────────────────────────────────────────────── */

// Crockford-style alphabet: no I, L, O, U — unambiguous when read aloud.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateReference() {
  const bytes = randomBytes(6);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return `SS-${code}`;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function orderPhotos(order: Pick<Order, 'photos'>): UploadedPhoto[] {
  return Array.isArray(order.photos) ? (order.photos as unknown as UploadedPhoto[]) : [];
}

/**
 * True when a stored photo URL is one this site could have issued.
 *
 * Checkout now rejects anything else at the door (see `photoUrlSchema`), but
 * rows written before that validation existed are still in the table, and the
 * admin dashboard turns each one into a link it clicks. Re-checking on the way
 * out means a bad row can only ever render as inert text.
 */
export function isSafePhotoUrl(url: string): boolean {
  return photoUrlSchema.safeParse(url).success;
}

export function orderAddOns(order: Pick<Order, 'addOns'>): { id: string; name: string; amount: number }[] {
  return Array.isArray(order.addOns)
    ? (order.addOns as unknown as { id: string; name: string; amount: number }[])
    : [];
}

function formatAddress(order: Order) {
  return [order.addressLine1, order.addressLine2, order.city, order.postalCode, order.country]
    .filter(Boolean)
    .join(', ');
}

/* ── Google Sheet hand-off ───────────────────────────────────────────────── */

/**
 * Appends the order to the studio's sheet (or Google Form).
 * Never throws: a failed hand-off is recorded on the order so it can be
 * retried from /admin — a payment must never be lost because Google was down.
 */
export async function syncOrderToSheet(order: Order): Promise<{ ok: boolean; error?: string }> {
  const photos = orderPhotos(order);
  const addOns = orderAddOns(order);
  const paidAt = (order.paidAt ?? new Date()).toISOString();

  // Only used to turn the stored ids ("graphite", "rolled") into readable
  // labels. The money on the row comes from the order itself, never from here,
  // so a later price edit cannot rewrite what a customer was charged.
  const catalogue = await getCatalogue();

  try {
    if (isFormConfigured()) {
      await submitToGoogleForm({
        reference: order.reference,
        paidAt,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone ?? '',
        country: order.country,
        packageName: order.packageName,
        packageSize: order.packageSize,
        style: getStyle(catalogue, order.style)?.name ?? order.style,
        subjects: String(order.subjects),
        addOns: addOns.map((a) => a.name).join(', '),
        delivery: getDelivery(catalogue, order.deliveryType)?.name ?? order.deliveryType,
        address: formatAddress(order),
        occasion: order.occasion ?? '',
        deadline: order.deadline ?? '',
        notes: order.notes ?? '',
        photos: photos.map((p) => p.url).join('\n'),
        total: formatMoney(order.amountPaid ?? order.total),
        provider: order.provider ?? '',
        paymentReference: order.providerPaymentId ?? order.providerOrderId ?? '',
      });
    } else if (isSheetsConfigured()) {
      await appendRow(
        ORDERS_TAB,
        [
          paidAt,
          order.reference,
          order.status,
          order.customerName,
          order.customerEmail,
          order.customerPhone ?? '',
          order.country,
          order.packageName,
          order.packageSize,
          getStyle(catalogue, order.style)?.name ?? order.style,
          order.subjects,
          addOns.map((a) => `${a.name} (${formatMoney(a.amount)})`).join(', '),
          getDelivery(catalogue, order.deliveryType)?.name ?? order.deliveryType,
          formatAddress(order),
          order.occasion ?? '',
          order.deadline ?? '',
          order.notes ?? '',
          photos.map((p) => p.url).join('\n'),
          ((order.amountPaid ?? order.total) / 100).toFixed(2),
          order.provider ?? '',
          order.providerPaymentId ?? order.providerOrderId ?? '',
          order.consented ? 'Yes' : 'No',
          [order.source, order.medium, order.campaign].filter(Boolean).join(' / '),
        ],
        ORDER_HEADERS,
      );
    } else {
      throw new Error(
        'No admin hand-off configured. Set the GOOGLE_* variables (see .env.example §6).',
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { sheetStatus: 'SYNCED', sheetRowAt: new Date(), sheetError: null },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.order.update({
      where: { id: order.id },
      data: { sheetStatus: 'FAILED', sheetError: message.slice(0, 1000) },
    });

    // Logged, not thrown — the webhook must still return 200 to the provider.
    console.error(`[orders] Sheet sync failed for ${order.reference}:`, message);
    return { ok: false, error: message };
  }
}

export async function appendContactToSheet(message: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  if (!isSheetsConfigured()) return { ok: false, error: 'Sheets not configured' };

  try {
    await appendRow(
      CONTACTS_TAB,
      [
        new Date().toISOString(),
        message.name,
        message.email,
        message.phone ?? '',
        message.subject,
        message.message,
      ],
      CONTACT_HEADERS,
    );
    return { ok: true };
  } catch (error) {
    console.error('[contact] Sheet sync failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/* ── The one transition that matters ─────────────────────────────────────── */

/**
 * Marks an order paid and runs the hand-off. Safe to call twice: Stripe and
 * PayPal both retry webhooks, and PayPal additionally hits our return URL, so
 * this WILL be called more than once for the same order in normal operation.
 */
export async function markOrderPaid(params: {
  orderId: string;
  provider: 'STRIPE' | 'PAYPAL';
  providerPaymentId?: string | null;
  amountPaid?: number | null;
  /**
   * Discount the provider itself applied — a Stripe promotion code, say.
   * Checkout enables promo codes, so `amountPaid` is legitimately below
   * `total` whenever one is used and must not be read as an underpayment.
   */
  discount?: number | null;
}): Promise<{ alreadyPaid: boolean; order: Order }> {
  const existing = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!existing) throw new Error(`Order ${params.orderId} not found`);

  if (existing.status === 'PAID') {
    // Second delivery of the same event — do nothing except report it.
    return { alreadyPaid: true, order: existing };
  }

  // Sanity check: never fulfil an order that was underpaid. A provider-applied
  // discount is added back before comparing, so a valid promotion code passes
  // while a tampered capture amount still does not.
  const credited = (params.amountPaid ?? 0) + (params.discount ?? 0);
  if (params.amountPaid != null && credited < existing.total) {
    await prisma.orderEvent.create({
      data: {
        orderId: existing.id,
        type: 'payment.amount_mismatch',
        message: `Expected ${existing.total}, received ${params.amountPaid}${
          params.discount ? ` (+${params.discount} discount)` : ''
        }`,
      },
    });
    throw new Error(
      `Amount mismatch on ${existing.reference}: expected ${existing.total}, got ${params.amountPaid}`,
    );
  }

  /**
   * Claim the order atomically.
   *
   * The check above is a read, and this is genuinely concurrent: PayPal hits
   * the return URL and its webhook at almost the same moment, so both callers
   * can see AWAITING_PAYMENT and both proceed. `updateMany` with the status in
   * the WHERE clause makes exactly one of them win, and the loser reports
   * `alreadyPaid` instead of sending the customer a second confirmation email
   * and writing a second row into the studio's sheet.
   */
  const claim = await prisma.order.updateMany({
    where: { id: existing.id, status: { not: 'PAID' } },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      provider: params.provider,
      providerPaymentId: params.providerPaymentId ?? existing.providerPaymentId,
      amountPaid: params.amountPaid ?? existing.total,
    },
  });

  if (claim.count === 0) {
    const current = await prisma.order.findUniqueOrThrow({ where: { id: existing.id } });
    return { alreadyPaid: true, order: current };
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: existing.id } });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: 'payment.succeeded',
      message: `${params.provider} ${params.providerPaymentId ?? ''}`.trim(),
    },
  });

  // Hand-off + emails run in parallel; neither can fail the payment.
  const photos = orderPhotos(order);
  const emailData = {
    reference: order.reference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    packageName: order.packageName,
    packageSize: order.packageSize,
    total: order.total,
    photoCount: photos.length,
  };

  await Promise.allSettled([
    syncOrderToSheet(order),
    sendOrderConfirmation(emailData).catch((e) =>
      console.error('[orders] Confirmation email failed:', e),
    ),
    sendAdminOrderAlert({ ...emailData, photos: photos.map((p) => p.url) }).catch((e) =>
      console.error('[orders] Admin alert failed:', e),
    ),
  ]);

  return { alreadyPaid: false, order };
}

/**
 * Records that a provider event id has been handled, and reports whether it
 * had already been seen. Stops a retried webhook double-processing an order.
 */
export async function claimWebhookEvent(id: string, provider: string, type: string) {
  try {
    await prisma.processedWebhook.create({ data: { id, provider, type } });
    return { fresh: true };
  } catch {
    // Unique-constraint violation = we have processed this event before.
    return { fresh: false };
  }
}
