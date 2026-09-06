import { NextResponse } from 'next/server';
import { COOKIES } from '@/lib/cookies';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.redirect(`${SITE_URL}/admin/login`, { status: 303 });
  response.cookies.set(COOKIES.admin, '', { path: '/', maxAge: 0 });
  return response;
}
