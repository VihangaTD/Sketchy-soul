import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { markOrderPaid } from '@/lib/orders';
import { capturePayPalOrder, getPayPalOrder } from '@/lib/paypal';
import { paymentOrigin } from '@/lib/payment-origin';

/**
 * GET /api/payments/paypal/capture — where PayPal sends the customer back.
 *
 * PayPal appends ?token=<paypal order id>&PayerID=<payer>. We capture the
 * funds here so the customer sees a confirmed order immediately rather than
 * waiting on a webhook. The webhook still runs as a backstop; markOrderPaid()
 * is idempotent, so whichever arrives second does nothing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const returnOrigin = paymentOrigin(request);
  const url = new URL(request.url);
  const paypalOrderId = url.searchParams.get('token');
  const reference = url.searchParams.get('ref');

  const fail = (why: string) =>
    NextResponse.redirect(
      `${returnOrigin}/order/cancelled?reason=${encodeURIComponent(why)}${
        reference ? `&ref=${reference}` : ''
      }`,
      { status: 303 },
    );

  if (!paypalOrderId) return fail('missing-token');

  const order = await prisma.order.findFirst({
    where: reference ? { reference } : { providerOrderId: paypalOrderId },
  });
  if (!order) return fail('order-not-found');

  // Already handled by the webhook that beat us here.
  if (order.status === 'PAID') {
    return NextResponse.redirect(`${returnOrigin}/order/success?ref=${order.reference}`, {
      status: 303,
    });
  }

  try {
    let capture = await getPayPalOrder(paypalOrderId);

    if (capture.status === 'APPROVED') {
      capture = await capturePayPalOrder(paypalOrderId);
    }

    if (capture.status !== 'COMPLETED') {
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'payment.not_completed',
          message: `PayPal status ${capture.status}`,
        },
      });
      return fail('payment-not-completed');
    }

    const captureDetail = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const amountPaid = captureDetail?.amount?.value
      ? Math.round(Number(captureDetail.amount.value) * 100)
      : null;

    await markOrderPaid({
      orderId: order.id,
      provider: 'PAYPAL',
      providerPaymentId: captureDetail?.id ?? paypalOrderId,
      amountPaid,
    });

    return NextResponse.redirect(`${returnOrigin}/order/success?ref=${order.reference}`, {
      status: 303,
    });
  } catch (error) {
    console.error('[paypal] Capture on return failed:', error);

    await prisma.orderEvent
      .create({
        data: {
          orderId: order.id,
          type: 'payment.capture_error',
          message: error instanceof Error ? error.message.slice(0, 500) : 'unknown',
        },
      })
      .catch(() => undefined);

    // The webhook may still succeed, so do not mark the order failed here.
    return fail('capture-error');
  }
}
