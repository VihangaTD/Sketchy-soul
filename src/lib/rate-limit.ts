/**
 * Dead-simple in-memory rate limiter for the public API routes.
 *
 * Good enough to stop a bot hammering the upload or contact endpoint from one
 * address. It is per-instance, so on a multi-region serverless deployment the
 * effective limit is (limit × instances) — fine for abuse control, not a
 * security boundary.
 *
 * If you ever need a real one, swap the body of `rateLimit()` for
 * @upstash/ratelimit; the signature is deliberately compatible.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers) {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
