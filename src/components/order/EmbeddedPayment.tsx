'use client';

import { useEffect, useRef, useState } from 'react';
import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js';

export function EmbeddedPayment({ clientSecret, publishableKey }: {
  clientSecret: string;
  publishableKey: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let checkout: StripeEmbeddedCheckout | undefined;
    setError(false);
    setLoading(true);

    async function mount() {
      try {
        const stripe = await loadStripe(publishableKey);
        if (disposed) return;
        if (!stripe) throw new Error('Stripe could not load.');
        checkout = await stripe.initEmbeddedCheckout({
          clientSecret,
        });
        if (disposed) {
          checkout.destroy();
          return;
        }
        if (container.current) checkout.mount(container.current);
        setLoading(false);
      } catch {
        if (!disposed) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void mount();
    return () => {
      disposed = true;
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey, attempt]);

  return (
    <div>
      {loading ? <p role="status" className="mb-6 text-center text-sm text-grey">Loading secure payment…</p> : null}
      {error ? (
        <div role="alert" className="mb-6 text-center">
          <p className="text-sm text-grey">Payment could not load. Check your connection and try again.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
        </div>
      ) : null}
      <div ref={container} />
    </div>
  );
}
