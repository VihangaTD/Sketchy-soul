import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';

import { verifyAdminToken } from '@/lib/admin-auth';
import { COOKIES } from '@/lib/cookies';
import type { CmsTag } from '@/lib/cms/cache';

/**
 * Every content-editing server action starts with `await requireAdmin()`.
 *
 * The middleware already bounces an unauthenticated browser away from /admin,
 * but a server action is a POST endpoint in its own right: it can be invoked
 * directly with the right action id and never pass through a page render. This
 * is the check that actually protects the data.
 */
export async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifyAdminToken(jar.get(COOKIES.admin)?.value))) {
    throw new Error('Not authorised.');
  }
}

/**
 * Publishes an edit.
 *
 * Two layers have to be cleared: the tagged data cache the `cmsRead` helpers
 * live in, and the rendered HTML of the pages that read them. Public pages are
 * statically generated with `revalidate = 3600`, so busting the tag alone
 * would leave the old page on the CDN for up to an hour — which reads as "my
 * change did not save".
 */
export async function publish(...tags: CmsTag[]) {
  for (const tag of tags) revalidateTag(tag);

  // Content appears in the header, footer and structured data of every page,
  // so the whole tree is refreshed rather than guessing at a route list.
  revalidatePath('/', 'layout');
}

/** Reads a trimmed string from a form, with an optional cap. */
export function text(form: FormData, key: string, max = 2000) {
  return String(form.get(key) ?? '')
    .trim()
    .slice(0, max);
}

/** Reads a checkbox. Unchecked boxes are simply absent from the payload. */
export function flag(form: FormData, key: string) {
  return form.get(key) != null;
}

/** Reads a whole-number field, clamped to a sane range. */
export function int(form: FormData, key: string, fallback = 0, min = 0, max = 1_000_000) {
  const parsed = Number.parseInt(String(form.get(key) ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Reads a price typed in dollars and stores it in cents.
 *
 * The artist thinks in "120", the database stores 12000. Doing the conversion
 * in one place is what stops a stray hundred-fold price error.
 */
export function money(form: FormData, key: string, fallback = 0) {
  const raw = String(form.get(key) ?? '').replace(/[^0-9.]/g, '');
  const dollars = Number.parseFloat(raw);
  if (!Number.isFinite(dollars) || dollars < 0) return fallback;
  return Math.round(dollars * 100);
}

/** Splits a textarea of one-per-line values into a clean array. */
export function lines(form: FormData, key: string) {
  return String(form.get(key) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** Turns a title into a URL-safe slug. */
export function slugify(value: string, fallback = 'item') {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
