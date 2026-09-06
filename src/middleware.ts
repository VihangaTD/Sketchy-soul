import { NextResponse, type NextRequest } from 'next/server';
import { COOKIES, COOKIE_MAX_AGE, parseConsent } from '@/lib/cookies';
import { verifyAdminToken } from '@/lib/admin-auth';

/**
 * Runs at the edge before every page request. Three jobs:
 *
 *  1. ADMIN GUARD  — /admin is private; an unsigned or expired session cookie
 *     is bounced to the login page before any database query happens.
 *
 *  2. ATTRIBUTION  — remembers which campaign or referrer brought a visitor,
 *     so paid orders can be traced back to what actually works. This writes
 *     cookies ONLY after the visitor has accepted analytics cookies; decline
 *     and nothing is stored.
 *
 *  3. CACHE HINTS  — tells the CDN that HTML may be served slightly stale
 *     while it revalidates, which is what makes repeat visits feel instant.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  /* ── 1. Admin guard ────────────────────────────────────────────────────── */
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const valid = await verifyAdminToken(request.cookies.get(COOKIES.admin)?.value).catch(
      () => false,
    );

    if (!valid) {
      const login = new URL('/admin/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
  }

  const response = NextResponse.next();

  /* ── 2. Consent-gated attribution ──────────────────────────────────────── */
  const consent = parseConsent(request.cookies.get(COOKIES.consent)?.value);

  if (consent?.analytics) {
    // Anonymous visitor id — a random string, never anything identifying.
    if (!request.cookies.get(COOKIES.visitor)) {
      response.cookies.set(COOKIES.visitor, crypto.randomUUID(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE.visitor,
      });
    }

    // First touch wins: never overwrite the campaign that first brought them.
    if (!request.cookies.get(COOKIES.attribution)) {
      const referrer = request.headers.get('referer') ?? '';
      const source =
        searchParams.get('utm_source') ??
        (referrer && !referrer.includes(request.nextUrl.host)
          ? safeHost(referrer)
          : 'direct');

      const attribution = {
        source,
        medium: searchParams.get('utm_medium') ?? (source === 'direct' ? 'none' : 'referral'),
        campaign: searchParams.get('utm_campaign') ?? '',
        landing: pathname,
      };

      response.cookies.set(COOKIES.attribution, JSON.stringify(attribution), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE.attribution,
      });
    }
  }

  /* ── 3. Cache hints for the CDN ────────────────────────────────────────── */
  // Pages that show per-visitor data — or whose contents depend on runtime
  // configuration, like which payment buttons exist — must never be cached by
  // a shared proxy.
  const isPrivate =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/api');

  if (isPrivate) {
    response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
  } else if (!response.headers.has('Cache-Control')) {
    // Serve the cached page instantly, refresh it in the background.
    response.headers.set(
      'Cache-Control',
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
  }

  return response;
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export const config = {
  /**
   * Skip static assets and image optimisation — running middleware on those
   * would add latency to every single file the browser fetches.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|uploads/|images/).*)',
  ],
};
