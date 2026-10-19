import { SITE_URL } from './site';

/** Preserve the checkout cookie's host, accepting only deployment-owned origins. */
export function paymentOrigin(request: Request): string {
  const deployment = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const branch = process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
  const configured = new URL(SITE_URL).origin;
  const allowed = new Set([configured, deployment, branch, production].filter(Boolean));
  const requested = new URL(request.url).origin;
  if (allowed.has(requested)) return requested;
  // Never use an arbitrary Host/Origin header as a payment redirect destination.
  return process.env.VERCEL_ENV === 'preview' && deployment ? deployment : configured;
}
