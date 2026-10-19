import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { generateReference } from '@/lib/orders';
import { priceOrder } from '@/lib/packages';
import { getCatalogue } from '@/lib/cms/catalogue';
import { buildOrderSchema, fieldErrors } from '@/lib/validation';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { createPayPalOrder, approvalLink, isPayPalConfigured } from '@/lib/paypal';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { COOKIES, COOKIE_MAX_AGE } from '@/lib/cookies';
import { paymentOrigin } from '@/lib/payment-origin';

/**
 * POST /api/checkout
 *
 * 1. Validates the submitted commission.
 * 2. RE-PRICES it from the server-side catalog — the browser's totals are
 *    ignored entirely, so a tampered request cannot buy an A2 for $1.
 * 3. Saves it to Postgres with status AWAITING_PAYMENT.
 * 4. Creates a Stripe Checkout session or a PayPal order.
 * 5. Returns the URL to redirect the customer to.
 *
 * The order is marked PAID only after provider verification (by webhook or
 * server-side reconciliation), never here — closing the tab must not grant a free
 * portrait, and one who pays must get their order even if their browser dies
 * on the way back.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const returnOrigin = paymentOrigin(request);
  const ip = clientIp(request.headers);
  const limit = rateLimit(`checkout:${ip}`, { limit: 12, windowMs: 10 * 60 * 1000 });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  /* ── 1. Validate ───────────────────────────────────────────────────────── */

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  // Honeypot: a filled hidden field means a bot. Pretend it worked.
  if (typeof body.company === 'string' && body.company.length > 0) {
    return NextResponse.json({ url: `${returnOrigin}/order/success` }, { status: 200 });
  }

  // Loaded here, on the server, from the live price list. The browser sends
  // ids only; both the validation and the pricing below use this copy, so an
  // edited or deleted package is caught rather than trusted.
  const catalogue = await getCatalogue();

  const parsed = buildOrderSchema(catalogue).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const input = parsed.data;

  /* ── 2. Re-price on the server ─────────────────────────────────────────── */

  let priced;
  try {
    priced = priceOrder(
      {
        packageId: input.packageId,
        addOnIds: input.addOnIds,
        style: input.style,
        subjects: input.subjects,
        deliveryId: input.deliveryId,
      },
      catalogue,
    );
  } catch {
    return NextResponse.json({ error: 'That package is no longer available.' }, { status: 400 });
  }

  const provider = input.provider;
  if (provider === 'stripe' && !isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Card payment is temporarily unavailable — please choose PayPal.' },
      { status: 503 },
    );
  }
  if (provider === 'paypal' && !isPayPalConfigured()) {
    return NextResponse.json(
      { error: 'PayPal is temporarily unavailable — please choose card payment.' },
      { status: 503 },
    );
  }

  /* ── 3. Persist ────────────────────────────────────────────────────────── */

  const jar = await cookies();
  let attribution: Record<string, string> = {};
  try {
    attribution = JSON.parse(jar.get(COOKIES.attribution)?.value ?? '{}');
  } catch {
    /* malformed cookie — attribution is optional, carry on */
  }

  const reference = generateReference();

  let order;
  try {
    order = await prisma.order.create({
      data: {
        reference,
        status: 'AWAITING_PAYMENT',

        packageId: priced.pkg.id,
        packageName: priced.pkg.name,
        packageSize: priced.pkg.size,
        addOns: priced.addOns.map((a) => ({ id: a.id, name: a.name, amount: a.price })),
        style: priced.style,
        subjects: priced.subjects,
        deliveryType: priced.delivery.id,

        currency: priced.currency,
        subtotal: priced.subtotal,
        addOnsTotal: priced.addOnsTotal,
        shipping: priced.shipping,
        total: priced.total,

        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        country: input.country,
        addressLine1: input.addressLine1 || null,
        addressLine2: input.addressLine2 || null,
        city: input.city || null,
        postalCode: input.postalCode || null,

        occasion: input.occasion || null,
        deadline: input.deadline || null,
        notes: input.notes || null,
        consented: input.allowPortfolioUse,

        photos: input.photos,

        provider: provider === 'stripe' ? 'STRIPE' : 'PAYPAL',

        visitorId: jar.get(COOKIES.visitor)?.value ?? null,
        source: attribution.source ?? null,
        medium: attribution.medium ?? null,
        campaign: attribution.campaign ?? null,
        landing: attribution.landing ?? null,

        events: { create: { type: 'created', message: `via ${provider}` } },
      },
    });
  } catch (error) {
    console.error('[checkout] Could not save order:', error);
    return NextResponse.json(
      {
        error:
          'We could not start your order. Please try again — if it persists, contact the studio and we will take it manually.',
      },
      { status: 500 },
    );
  }

  const successUrl = `${returnOrigin}/order/success?ref=${order.reference}`;
  const cancelUrl = `${returnOrigin}/order/cancelled?ref=${order.reference}`;

  /* ── 4. Create the payment ─────────────────────────────────────────────── */

  try {
    let redirectUrl: string;

    if (provider === 'stripe') {
      const stripe = getStripe();

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          // Prefilled so the customer does not retype it.
          customer_email: input.customerEmail,
          client_reference_id: order.reference,
          line_items: priced.lines.map((line) => ({
            quantity: 1,
            price_data: {
              currency: priced.currency,
              unit_amount: line.amount,
              product_data: {
                name: line.label,
                ...(line.meta ? { description: line.meta } : {}),
              },
            },
          })),
          // Read back by the webhook to find this order.
          metadata: { orderId: order.id, reference: order.reference },
          payment_intent_data: {
            metadata: { orderId: order.id, reference: order.reference },
            description: `Portrait commission ${order.reference}`,
          },
          success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl,
          // A stale session must not hold a slot in the queue forever.
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
          allow_promotion_codes: true,
        },
        // Retried network calls reuse the same session instead of making two.
        { idempotencyKey: `checkout-${order.id}` },
      );

      if (!session.url) throw new Error('Stripe returned a session without a URL.');

      await prisma.order.update({
        where: { id: order.id },
        data: { providerOrderId: session.id },
      });

      redirectUrl = session.url;
    } else {
      // `priced.lines` already carries the delivery charge as a line of its
      // own. PayPal lists shipping separately in the breakdown AND validates
      // item_total against the sum of `items`, so sending the delivery line
      // inside `items` while also declaring it as shipping is counted twice
      // and the order is rejected with ITEM_TOTAL_MISMATCH — which broke every
      // PayPal checkout that chose a rolled or framed delivery.
      const itemLines = priced.lines.filter((line) => line.id !== `delivery-${priced.delivery.id}`);
      const itemTotal = itemLines.reduce((sum, line) => sum + line.amount, 0);

      const paypalOrder = await createPayPalOrder({
        reference: order.reference,
        currency: priced.currency,
        items: itemLines.map((line) => ({
          name: line.label,
          description: line.meta,
          quantity: '1',
          unit_amount: (line.amount / 100).toFixed(2),
        })),
        itemTotal,
        shipping: priced.shipping,
        total: priced.total,
        returnUrl: `${returnOrigin}/api/payments/paypal/capture?ref=${order.reference}`,
        cancelUrl,
        customerEmail: input.customerEmail,
      });

      const approve = approvalLink(paypalOrder);
      if (!approve) throw new Error('PayPal returned no approval link.');

      await prisma.order.update({
        where: { id: order.id },
        data: { providerOrderId: paypalOrder.id },
      });

      redirectUrl = approve;
    }

    await prisma.orderEvent.create({
      data: { orderId: order.id, type: 'checkout.started', message: provider },
    });

    /* ── 5. Respond ──────────────────────────────────────────────────────── */

    const response = NextResponse.json({ url: redirectUrl, reference: order.reference });

    // Lets /order/success greet the customer by reference even if the payment
    // provider strips the query string on the way back.
    response.cookies.set(COOKIES.lastOrder, order.reference, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE.lastOrder,
    });

    return response;
  } catch (error) {
    console.error('[checkout] Payment session failed:', error);

    await prisma.order
      .update({ where: { id: order.id }, data: { status: 'FAILED' } })
      .catch(() => undefined);

    return NextResponse.json(
      { error: 'We could not reach the payment provider. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
