'use client';

import { useSiteDetails } from '@/components/ContactDetailsProvider';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Catches any unhandled render error so a visitor never sees a blank page.
 * In production the message is deliberately generic — stack traces belong in
 * the server logs, not in front of a customer.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const site = useSiteDetails();
  useEffect(() => {
    console.error('[app] Unhandled error:', error);
  }, [error]);

  return (
    <section className="section">
      <div className="shell mx-auto max-w-lg text-center">
        <p className="eyebrow mb-3">Something Broke</p>
        <h1 className="heading">A line went astray.</h1>

        <p className="lede mx-auto mt-4 max-w-[38ch]">
          Sorry — that page failed to load. Try again, and if it keeps happening
          the studio would genuinely like to know.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-grey">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary w-full sm:w-auto">
            Try Again
          </button>
          <Link href="/" className="btn-ghost w-full sm:w-auto">
            Back to the Studio
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-grey">
          Mid-order?{' '}
          <a href={`mailto:${site.email}`} className="text-gold-soft underline-offset-4 hover:underline">
            {site.email}
          </a>{' '}
          — nothing is charged unless the payment page confirms it.
        </p>
      </div>
    </section>
  );
}
