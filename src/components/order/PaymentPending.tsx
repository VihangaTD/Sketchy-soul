'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Shown when the customer returns from the payment provider before its webhook
 * has reached us — a few seconds, occasionally longer on bank transfers.
 *
 * Refreshes the server component every few seconds so the page flips to
 * "confirmed" on its own, then gives up gracefully rather than spinning
 * forever.
 */
export function PaymentPending({ reference }: { reference: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= 10) return;

    const id = window.setTimeout(() => {
      setAttempts((a) => a + 1);
      router.refresh();
    }, 3000);

    return () => window.clearTimeout(id);
  }, [attempts, router]);

  const givenUp = attempts >= 10;

  return (
    <div className="panel p-6 text-center">
      <p className="eyebrow mb-3">{givenUp ? 'Taking longer than usual' : 'Confirming payment'}</p>

      {!givenUp ? (
        <>
          <div className="mx-auto mb-4 h-px w-24 overflow-hidden bg-hairline">
            <span className="block h-full w-1/3 animate-shimmer bg-gold" />
          </div>
          <p className="text-[13px] leading-relaxed text-grey">
            Your payment is going through. This page will update by itself —
            there is no need to pay again.
          </p>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-grey">
          Your payment provider is slower than usual. Your order{' '}
          <span className="text-ivory">{reference}</span> is safe, and you will
          get a confirmation email as soon as it clears. If nothing arrives
          within an hour, send us that reference and we will check it manually.
        </p>
      )}
    </div>
  );
}
