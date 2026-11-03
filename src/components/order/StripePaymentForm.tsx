'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { loadStripe, type StripeCheckout, type StripeCheckoutSession, type StripePaymentElement } from '@stripe/stripe-js';

export function StripePaymentForm({ clientSecret, publishableKey, successUrl }: {
  clientSecret: string;
  publishableKey: string;
  successUrl: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeCheckout | null>(null);
  const busy = useRef(false);
  const [session, setSession] = useState<StripeCheckoutSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let element: StripePaymentElement | undefined;
    setReady(false);
    setLoadError(false);
    setError('');
    setSession(null);

    async function mount() {
      try {
        const stripe = await loadStripe(publishableKey);
        if (disposed) return;
        if (!stripe) throw new Error('Stripe could not load.');
        const checkout = await stripe.initCheckout({
          fetchClientSecret: async () => clientSecret,
          elementsOptions: {
            appearance: {
              theme: 'night',
              variables: { colorPrimary: '#b8935a', colorBackground: '#151517', colorText: '#f2efea', borderRadius: '2px' },
            },
          },
        });
        if (disposed) return;
        checkoutRef.current = checkout;
        setSession(checkout.session());
        checkout.on('change', (next) => { if (!disposed) setSession(next); });
        element = checkout.createPaymentElement({ layout: 'accordion' });
        element.on('ready', () => { if (!disposed) setReady(true); });
        element.on('loaderror', () => {
          if (!disposed) {
            setLoadError(true);
            setReady(false);
          }
        });
        if (container.current) element.mount(container.current);
      } catch {
        if (!disposed) setLoadError(true);
      }
    }

    void mount();
    return () => {
      disposed = true;
      checkoutRef.current = null;
      element?.destroy();
    };
  }, [clientSecret, publishableKey, attempt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const checkout = checkoutRef.current;
    if (!checkout || !ready || busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const result = await checkout.confirm({ redirect: 'if_required' });
      if (result.type === 'error') setError(result.error.message);
      else window.location.assign(successUrl);
    } catch {
      setError('Payment could not be confirmed. Check your connection and try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function updatePromotion(remove = false) {
    const checkout = checkoutRef.current;
    if (!checkout || busy.current || (!remove && !promoCode.trim())) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const result = await (remove ? checkout.removePromotionCode() : checkout.applyPromotionCode(promoCode.trim()));
      if (result.type === 'error') setError(result.error.message);
      else {
        setSession(result.session);
        setPromoCode('');
      }
    } catch {
      setError('Could not update the promotion code. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const money = (amount: number) => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: session?.currency ?? 'USD',
  }).format(amount / (session?.minorUnitsAmountDivisor ?? 100));

  return (
    <form onSubmit={submit} className="panel space-y-6 p-6 sm:p-8">
      {session ? (
        <div>
          <p className="eyebrow mb-4">Your order</p>
          <ul className="space-y-3 text-sm">
            {session.lineItems.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span className="text-grey">{item.name}</span>
                <span>{money(item.total.minorUnitsAmount)}</span>
              </li>
            ))}
          </ul>
          {session.discountAmounts?.length ? (
            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-gold-soft">
              <span>Discount: −{money(session.total.discount.minorUnitsAmount)}</span>
              <button type="button" disabled={pending} className="underline" onClick={() => void updatePromotion(true)}>Remove</button>
            </div>
          ) : null}
          <p className="mt-5 flex justify-between border-t border-hairline pt-4 text-lg">
            <span>Total</span><span className="text-gold-soft">{money(session.total.total.minorUnitsAmount)}</span>
          </p>
        </div>
      ) : null}
      {!ready && !loadError ? <p role="status" className="text-sm text-grey">Loading secure payment…</p> : null}
      {loadError ? (
        <div role="alert">
          <p className="text-sm text-grey">Payment could not load. Check your connection and try again.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
        </div>
      ) : null}
      <div ref={container} />
      {ready && !loadError ? (
        <>
          <div>
            <label htmlFor="promotion-code" className="mb-2 block text-sm text-grey">Promotion code (optional)</label>
            <div className="flex gap-3">
              <input id="promotion-code" className="field min-w-0 flex-1" value={promoCode} disabled={pending} onChange={(event) => setPromoCode(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void updatePromotion();
                }
              }} />
              <button type="button" className="btn-primary" disabled={pending || !promoCode.trim()} onClick={() => void updatePromotion()}>Apply</button>
            </div>
          </div>
          {error ? <p role="alert" className="error-text">{error}</p> : null}
          <button type="submit" className="btn-primary w-full disabled:opacity-70" disabled={pending || !session?.canConfirm}>
            {pending ? 'Processing…' : `Pay ${session ? money(session.total.total.minorUnitsAmount) : ''} securely`}
          </button>
          <p className="text-center text-xs leading-relaxed text-grey">Secure payment powered by Stripe. Your order is confirmed after payment is verified.</p>
        </>
      ) : null}
    </form>
  );
}
