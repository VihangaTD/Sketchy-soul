import Stripe from 'stripe';

/**
 * Stripe client.
 *
 * ⚠️ DEPLOY CHECKLIST
 *   1. STRIPE_SECRET_KEY            → sk_live_… (test key = no real money)
 *   2. STRIPE_WEBHOOK_SECRET        → from the LIVE endpoint you create at
 *                                     https://dashboard.stripe.com/webhooks
 *                                     pointing at /api/webhooks/stripe
 *   3. Activate your account (Stripe → Settings → Business) or live payments
 *      are rejected.
 *   4. Add your domain in Settings → Payments → Payment methods → Apple Pay
 *      if you want the Apple Pay button in Checkout.
 *
 * Leaving the keys blank simply disables Stripe as a payment option — the site
 * still builds and PayPal still works.
 */

let client: Stripe | null = null;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set — Stripe checkout is unavailable.');
  }

  // Created lazily so a missing key never breaks the build, only the request.
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Retries protect against a dropped connection creating a duplicate order.
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'Sketchy Soul', version: '1.0.0' },
  });

  return client;
}

/** True when the key in use is a test-mode key — surfaced in the admin UI. */
export const isStripeTestMode = () =>
  (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test');
