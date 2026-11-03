import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { StripePaymentForm } from '@/components/order/StripePaymentForm';
import { SectionHead } from '@/components/SectionHead';
import { COOKIES } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { getStripe, isStripePaymentConfigured } from '@/lib/stripe';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Secure Payment',
  description: 'Complete payment for your portrait order.',
  path: '/order/payment',
  noIndex: true,
});

export default async function PaymentPage({ searchParams }: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const jar = await cookies();
  const ownedReference = jar.get(COOKIES.lastOrder)?.value;
  if (!ownedReference || (ref && ref !== ownedReference)) redirect('/order');

  const order = await prisma.order.findUnique({ where: { reference: ownedReference } });
  if (!order || order.provider !== 'STRIPE') redirect('/order');
  const successUrl = `/order/success?ref=${encodeURIComponent(order.reference)}`;
  if (order.status === 'PAID') redirect(successUrl);

  let clientSecret: string | null = null;
  let complete = false;
  let previousCheckout = false;
  let expired = order.status !== 'AWAITING_PAYMENT';
  if (!expired && order.providerOrderId && isStripePaymentConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(order.providerOrderId);
      if (session.metadata?.orderId !== order.id || session.client_reference_id !== order.reference) {
        throw new Error('Payment session does not match the order.');
      }
      complete = session.status === 'complete';
      expired = session.status === 'expired';
      previousCheckout = session.status === 'open' && session.ui_mode !== 'custom';
      if (session.status === 'open' && session.ui_mode === 'custom') {
        clientSecret = session.client_secret;
      }
    } catch {
      console.error('[stripe] Payment Element session could not be loaded.');
    }
  }
  if (complete) redirect(successUrl);

  return (
    <section className="section bg-gold-wash">
      <div className="shell mx-auto max-w-4xl">
        <SectionHead as="h1" eyebrow="Secure Payment" title="Complete your order." />
        {clientSecret ? (
          <div className="mt-8">
            {order.addressLine1 ? (
              <p className="mb-6 rounded-sm border border-hairline p-4 text-sm leading-relaxed text-grey">
                Please note that international orders may be subject to import duties,
                customs fees or taxes imposed by the destination country. Any applicable
                charges not included at checkout are the responsibility of the customer.
              </p>
            ) : null}
            <StripePaymentForm clientSecret={clientSecret} publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!} successUrl={successUrl} />
          </div>
        ) : (
          <div className="mt-8 text-center">
            <p role="alert" className="text-grey">
              {previousCheckout ? 'Checkout has been updated. Please start a new order to use the new payment form.' : expired ? 'This payment session has expired. Please start a new order.' : 'Payment is temporarily unavailable. Please reload this page to try again.'}
            </p>
            <Link href="/order" className="btn-primary mt-6">Return to order</Link>
          </div>
        )}
      </div>
    </section>
  );
}
