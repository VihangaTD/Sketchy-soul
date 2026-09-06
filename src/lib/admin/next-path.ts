/**
 * Reduces a `?next=` parameter to somewhere inside the admin panel.
 *
 * The login form reads its post-sign-in destination off the query string, and
 * that value is chosen by whoever wrote the link. Used as-is,
 * `/admin/login?next=https://evil.com` walks the studio owner straight off the
 * site the instant their password is accepted — most likely onto a copy of the
 * form they just used, which is how the password gets collected a second time.
 *
 * Only a path inside /admin is honoured. Everything else lands on the
 * dashboard, which is never the wrong place to be after signing in.
 */
export function safeAdminPath(next: string | null | undefined): string {
  const fallback = '/admin';
  if (!next) return fallback;

  // Must be a path, not a URL with a scheme.
  if (!next.startsWith('/')) return fallback;

  /**
   * `//evil.com` and `/\evil.com` are the two that catch people out: neither
   * has a scheme, so a plain `startsWith('/')` test passes them, and browsers
   * read both as protocol-relative URLs pointing at another host.
   */
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;

  // Backslashes are normalised to forward slashes by some browsers, so a path
  // containing one cannot be trusted to stay a path.
  if (next.includes('\\')) return fallback;

  if (next !== '/admin' && !next.startsWith('/admin/') && !next.startsWith('/admin?')) {
    return fallback;
  }

  return next;
}
