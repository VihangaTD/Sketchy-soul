import type { Order } from '@prisma/client';
import { getStripe } from './stripe';
import { markOrderPaid } from './orders';

/** Call only after authorizing access to the order. Never trust browser payment claims. */
export async function reconcileStripeOrder(order: Order): Promise<Order> {
  if (order.provider !== 'STRIPE' || order.status !== 'AWAITING_PAYMENT' || !order.providerOrderId) {
    return order;
  }

  const session = await getStripe().checkout.sessions.retrieve(order.providerOrderId);
  if (
    session.metadata?.orderId !== order.id ||
    session.client_reference_id !== order.reference ||
    session.currency !== order.currency.toLowerCase()
  ) {
    throw new Error('Stripe session does not match this order.');
  }
  if (session.status !== 'complete' || session.payment_status !== 'paid') return order;
  if (session.amount_total == null) throw new Error('Stripe payment amount is missing.');

  const result = await markOrderPaid({
    orderId: order.id,
    provider: 'STRIPE',
    providerPaymentId: typeof session.payment_intent === 'string'
      ? session.payment_intent : session.payment_intent?.id,
    amountPaid: session.amount_total,
    discount: session.total_details?.amount_discount ?? 0,
  });
  return result.order;
}
