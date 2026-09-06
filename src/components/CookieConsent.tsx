'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COOKIES,
  COOKIE_MAX_AGE,
  parseConsent,
  serializeConsent,
  type ConsentState,
} from '@/lib/cookies';

/**
 * Cookie banner with real teeth: nothing analytics-related runs until the
 * visitor presses Accept, and "Decline" is exactly as easy to press as
 * "Accept" (a legal requirement in the EU/UK, and the honest thing to do).
 *
 * The choice is broadcast as a `ss:consent` window event so Analytics.tsx and
 * the attribution middleware can react without a page reload.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIES.consent}=`))
      ?.split('=')
      .slice(1)
      .join('=');

    if (!parseConsent(raw)) {
      // Small delay so the banner does not fight the hero for attention (and
      // does not count against Largest Contentful Paint).
      const t = window.setTimeout(() => setVisible(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  const save = (state: Pick<ConsentState, 'analytics' | 'marketing'>) => {
    document.cookie = [
      `${COOKIES.consent}=${serializeConsent({ necessary: true, ...state })}`,
      'path=/',
      `max-age=${COOKIE_MAX_AGE.consent}`,
      'samesite=lax',
      location.protocol === 'https:' ? 'secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    window.dispatchEvent(new CustomEvent('ss:consent', { detail: state }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(var(--tabbar-h)+12px)] md:pb-4"
    >
      <div className="panel mx-auto max-w-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:p-6">
        <p className="eyebrow mb-2">Cookies</p>
        <p className="text-[13px] leading-relaxed text-grey">
          We use a couple of essential cookies to keep your order draft and
          your choices here. With your permission we would also like to measure
          which pages lead to orders.{' '}
          <Link href="/privacy" className="text-gold-soft underline underline-offset-4">
            Read the cookie policy
          </Link>
          .
        </p>

        {detail ? (
          <div className="mt-4 space-y-3 border-t border-hairline pt-4">
            <label className="flex items-start gap-3 opacity-60">
              <input type="checkbox" checked disabled className="mt-1 accent-[#b8935a]" />
              <span className="text-[12.5px] text-grey">
                <b className="block text-ivory">Strictly necessary</b>
                Consent choice, order draft, checkout security. Always on.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 accent-[#b8935a]"
              />
              <span className="text-[12.5px] text-grey">
                <b className="block text-ivory">Analytics</b>
                Anonymous visit counts and which campaign brought you here.
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => save({ analytics: detail ? analytics : true, marketing: false })}
            className="btn-primary btn-sm flex-1"
          >
            {detail ? 'Save choices' : 'Accept'}
          </button>
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            className="btn-ghost btn-sm flex-1"
          >
            Decline
          </button>
          {!detail ? (
            <button
              type="button"
              onClick={() => setDetail(true)}
              className="text-[11px] uppercase tracking-[0.16em] text-grey transition-colors hover:text-gold-soft sm:px-3"
            >
              Customise
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
