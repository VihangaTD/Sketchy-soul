'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { COOKIES, parseConsent } from '@/lib/cookies';

/**
 * Google Analytics 4 — consent-gated.
 *
 * The gtag script tag is not even rendered until the visitor accepts analytics
 * cookies, so a "Decline" really means no third-party requests, no _ga cookie
 * and no extra JavaScript. Set NEXT_PUBLIC_GA_MEASUREMENT_ID to switch it on;
 * leave it blank and this component renders nothing at all.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const read = () => {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${COOKIES.consent}=`))
        ?.split('=')
        .slice(1)
        .join('=');
      setAllowed(Boolean(parseConsent(raw)?.analytics));
    };

    read();

    const onConsent = (e: Event) => {
      setAllowed(Boolean((e as CustomEvent<{ analytics: boolean }>).detail?.analytics));
    };
    window.addEventListener('ss:consent', onConsent);
    return () => window.removeEventListener('ss:consent', onConsent);
  }, []);

  if (!id || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}

/**
 * Fire a conversion / funnel event from anywhere in the app.
 * No-ops safely when analytics is declined or GA is not configured.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.('event', name, params);
}
