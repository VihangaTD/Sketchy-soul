import { NextResponse } from 'next/server';
import { checkAdminPassword, createAdminToken } from '@/lib/admin-auth';
import { COOKIES, COOKIE_MAX_AGE } from '@/lib/cookies';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Five attempts per 15 minutes per IP — enough for a typo, useless for a
  // brute-force attempt.
  const limit = rateLimit(`admin-login:${clientIp(request.headers)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Admin access is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' },
      { status: 503 },
    );
  }

  if (!checkAdminPassword(body.password ?? '')) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIES.admin, await createAdminToken(COOKIE_MAX_AGE.admin), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE.admin,
  });

  return response;
}
