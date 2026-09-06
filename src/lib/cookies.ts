/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  COOKIE POLICY — implemented, not just written down                      ║
 * ║                                                                          ║
 * ║  Only two cookies are set before consent, and both are strictly          ║
 * ║  necessary:                                                              ║
 * ║    ss_consent      remembers the visitor's own choice (12 months)        ║
 * ║    ss_order_draft  keeps a half-finished commission alive on refresh     ║
 * ║                    (7 days, no personal data — ids and counts only)      ║
 * ║                                                                          ║
 * ║  Everything else waits for an explicit "Accept":                         ║
 * ║    ss_vid          anonymous visitor id, for attributing an order        ║
 * ║    ss_attr         utm_source / medium / campaign of the first visit     ║
 * ║    Google Analytics is not loaded at all until analytics is accepted.    ║
 * ║                                                                          ║
 * ║  Keep this file and /privacy in sync — the privacy page reads the same   ║
 * ║  COOKIE_REGISTRY array so the published table can never drift.           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const COOKIES = {
  consent: 'ss_consent',
  visitor: 'ss_vid',
  attribution: 'ss_attr',
  orderDraft: 'ss_order_draft',
  lastOrder: 'ss_last_order',
  admin: 'ss_admin',
} as const;

export const COOKIE_MAX_AGE = {
  consent: 60 * 60 * 24 * 365, // 12 months
  visitor: 60 * 60 * 24 * 180, // 6 months
  attribution: 60 * 60 * 24 * 30, // 30 days
  orderDraft: 60 * 60 * 24 * 7, // 7 days
  lastOrder: 60 * 60 * 2, // 2 hours — just long enough for the thank-you page
  admin: 60 * 60 * 8, // one working day
} as const;

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** Bump when the cookie list changes — visitors are then re-asked. */
  v: number;
  ts: number;
}

export const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  v: CONSENT_VERSION,
  ts: 0,
};

export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (parsed.v !== CONSENT_VERSION) return null; // policy changed → ask again
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      v: CONSENT_VERSION,
      ts: Number(parsed.ts) || 0,
    };
  } catch {
    return null;
  }
}

export function serializeConsent(state: Omit<ConsentState, 'v' | 'ts'>) {
  return encodeURIComponent(
    JSON.stringify({ ...state, necessary: true, v: CONSENT_VERSION, ts: Date.now() }),
  );
}

/** Public table rendered on /privacy. */
export const COOKIE_REGISTRY = [
  {
    name: COOKIES.consent,
    category: 'Strictly necessary',
    purpose: 'Stores which cookie categories you agreed to, so we stop asking.',
    duration: '12 months',
  },
  {
    name: COOKIES.orderDraft,
    category: 'Strictly necessary',
    purpose:
      'Keeps your order selections (package, size, options) if you refresh or come back later. Contains no personal details.',
    duration: '7 days',
  },
  {
    name: COOKIES.lastOrder,
    category: 'Strictly necessary',
    purpose: 'Lets the confirmation page show the order you just paid for.',
    duration: '2 hours',
  },
  {
    name: COOKIES.visitor,
    category: 'Analytics',
    purpose: 'A random id — never your name or email — used to count unique visits.',
    duration: '6 months',
  },
  {
    name: COOKIES.attribution,
    category: 'Analytics',
    purpose: 'Remembers which link or campaign brought you here so we know what works.',
    duration: '30 days',
  },
  {
    name: '_ga, _ga_*',
    category: 'Analytics',
    purpose: 'Google Analytics. Only loaded after you accept analytics cookies.',
    duration: 'Up to 24 months',
  },
  {
    name: COOKIES.admin,
    category: 'Strictly necessary',
    purpose: 'Signs the studio owner into the private order dashboard.',
    duration: '8 hours',
  },
] as const;
