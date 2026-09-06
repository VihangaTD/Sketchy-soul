import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { claimWebhookEvent, markOrderPaid } from '@/lib/orders';
import { capturePayPalOrder, isPayPalConfigured, verifyPayPalWebhook } from '@/lib/paypal';

/**
 * POST /api/webhooks/paypal
 *
 * The safety net behind /api/payments/paypal/capture. If the customer closes
 * the tab after approving payment but before returning to the site, this is
 * what still marks the order paid and pushes it to the Google Sheet.
 *
 * ⚠️ DEPLOY
 *   developer.paypal.com → your LIVE app → Webhooks → Add
 *     URL    https://your-domain.com/api/webhooks/paypal
 *     Events CHECKOUT.ORDER.APPROVED
 *            PAYMENT.CAPTURE.COMPLETED
 *            PAYMENT.CAPTURE.DENIED
 *            PAYMENT.CAPTURE.REFUNDED
 *   Copy the webhook id into PAYPAL_WEBHOOK_ID.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PayPalEvent {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: { value?: string; currency_code?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

export async function POST(request: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PayPal is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();

  // Without PAYPAL_WEBHOOK_ID we cannot prove this came from PayPal, and an
  // unverified "payment completed" is exactly how free portraits get stolen.
  const verified = await verifyPayPalWebhook({ headers: request.headers, rawBody });
  if (!verified) {
    console.error('[paypal] Webhook signature verification failed.');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    // Verified as PayPal's but unparseable — answering 400 rather than
    // throwing keeps this out of the unhandled-error path, where it would
    // become a 500 and put PayPal into a three-day retry loop.
    return NextResponse.json({ error: 'Malformed event body.' }, { status: 400 });
  }

  if (!event?.id || !event.event_type) {
    return NextResponse.json({ error: 'Event is missing an id or type.' }, { status: 400 });
  }

  const { fresh } = await claimWebhookEvent(event.id, 'paypal', event.event_type);
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        // Approved but not captured — take the money now.
        const paypalOrderId = event.resource?.id;
        if (!paypalOrderId) break;

        const order = await prisma.order.findFirst({
          where: { providerOrderId: paypalOrderId },
        });
        if (!order || order.status === 'PAID') break;

        const capture = await capturePayPalOrder(paypalOrderId);
        const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;

        await markOrderPaid({
          orderId: order.id,
          provider: 'PAYPAL',
          providerPaymentId: captureId ?? paypalOrderId,
        });
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const reference = event.resource?.custom_id ?? event.resource?.invoice_id;
        const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;

        const order = await prisma.order.findFirst({
          where: reference
            ? { reference }
            : paypalOrderId
              ? { providerOrderId: paypalOrderId }
              : { id: '__none__' },
        });
        if (!order) break;

        const amountPaid = event.resource?.amount?.value
          ? Math.round(Number(event.resource.amount.value) * 100)
          : null;

        await markOrderPaid({
          orderId: order.id,
          provider: 'PAYPAL',
          providerPaymentId: event.resource?.id ?? null,
          amountPaid,
        });
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        await transition(event.resource?.custom_id, 'FAILED', 'payment.denied');
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        await transition(event.resource?.custom_id, 'REFUNDED', 'payment.refunded');
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[paypal] Handler failed for ${event.event_type}:`, error);
    await prisma.processedWebhook.delete({ where: { id: event.id } }).catch(() => undefined);
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 });
  }
}

async function transition(
  reference: string | undefined,
  status: 'FAILED' | 'REFUNDED',
  type: string,
) {
  if (!reference) return;

  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) return;

  // FAILED must never overwrite a PAID order: PayPal can deliver a DENIED for
  // one attempt after a later attempt on the same order succeeded. A refund is
  // the only status that legitimately follows payment.
  const changed = await prisma.order.updateMany({
    where: { id: order.id, ...(status === 'REFUNDED' ? {} : { status: { not: 'PAID' } }) },
    data: { status },
  });

  if (changed.count === 0) return;

  await prisma.orderEvent.create({ data: { orderId: order.id, type } });
}
