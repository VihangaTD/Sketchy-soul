import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { claimWebhookEvent, markOrderPaid } from '@/lib/orders';

/**
 * POST /api/webhooks/stripe — the moment an order becomes real.
 *
 * ⚠️ DEPLOY
 *   Stripe dashboard → Developers → Webhooks → Add endpoint
 *     URL    https://your-domain.com/api/webhooks/stripe
 *     Events checkout.session.completed
 *            checkout.session.async_payment_succeeded
 *            checkout.session.async_payment_failed
 *            checkout.session.expired
 *   Copy the signing secret into STRIPE_WEBHOOK_SECRET.
 *
 *   Test locally with:
 *     stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *     stripe trigger checkout.session.completed
 *
 * Two rules this route follows religiously:
 *   1. Verify the signature before trusting a single byte.
 *   2. Always answer 2xx once the event is understood — a 500 makes Stripe
 *      retry for three days, and duplicate retries must not duplicate work
 *      (hence claimWebhookEvent + the idempotent markOrderPaid).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  // The RAW body is required — parsing it first would break the signature.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error('[stripe] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // Stripe re-sends events on any non-2xx. Process each one exactly once.
  const { fresh } = await claimWebhookEvent(event.id, 'stripe', event.type);
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Bank-debit methods complete asynchronously; wait for the paid state.
        if (session.payment_status !== 'paid') break;

        const orderId = session.metadata?.orderId;
        if (!orderId) {
          console.error('[stripe] Session without orderId metadata:', session.id);
          break;
        }

        await markOrderPaid({
          orderId,
          provider: 'STRIPE',
          providerPaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          amountPaid: session.amount_total,
          // Checkout sets allow_promotion_codes, so a valid coupon makes
          // amount_total legitimately smaller than the order total. Without
          // this the underpayment guard rejects the event, Stripe retries for
          // three days, and a customer who paid never gets their portrait.
          discount: session.total_details?.amount_discount ?? 0,
        });
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await updateStatus(session.metadata?.orderId, 'FAILED', 'payment.failed');
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await updateStatus(session.metadata?.orderId, 'CANCELLED', 'checkout.expired');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

        if (paymentIntentId) {
          const order = await prisma.order.findFirst({
            where: { providerPaymentId: paymentIntentId },
          });
          if (order) await updateStatus(order.id, 'REFUNDED', 'payment.refunded');
        }
        break;
      }

      default:
        // Unhandled types are fine — acknowledge so Stripe stops retrying.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[stripe] Handler failed for ${event.type}:`, error);

    // 500 tells Stripe to retry. claimWebhookEvent has already recorded the id,
    // so release it to let the retry through.
    await prisma.processedWebhook.delete({ where: { id: event.id } }).catch(() => undefined);

    return NextResponse.json({ error: 'Handler error.' }, { status: 500 });
  }
}

async function updateStatus(
  orderId: string | null | undefined,
  status: 'FAILED' | 'CANCELLED' | 'REFUNDED',
  eventType: string,
) {
  if (!orderId) return;

  // A PAID order is terminal as far as these events are concerned. Stripe can
  // deliver `checkout.session.expired` for the very session that was already
  // paid (and events are not ordered), and letting that through would flip a
  // fulfilled commission to CANCELLED after the customer's money was taken.
  // REFUNDED is the one transition that is genuinely allowed to follow PAID.
  const allowedFrom =
    status === 'REFUNDED' ? undefined : ({ not: 'PAID' } as const);

  const changed = await prisma.order
    .updateMany({ where: { id: orderId, ...(allowedFrom ? { status: allowedFrom } : {}) }, data: { status } })
    .catch(() => ({ count: 0 }));

  if (changed.count === 0) return;

  await prisma.orderEvent
    .create({ data: { orderId, type: eventType } })
    .catch(() => undefined);
}
