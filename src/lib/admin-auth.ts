/**
 * Admin session tokens.
 *
 * A signed, expiring token in an httpOnly cookie — no session table, no
 * third-party auth service. Built on Web Crypto so the exact same code runs in
 * the Edge middleware and in Node route handlers.
 *
 * ⚠️ DEPLOY: set ADMIN_PASSWORD and ADMIN_SESSION_SECRET. Generate the secret
 * with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * This guards a private order list, not a bank. If several people need access,
 * put the site behind Vercel Authentication or swap in a real auth provider.
 */

const encoder = new TextEncoder();

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET is missing or too short (needs 32+ characters).');
  }
  return value;
}

async function key() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Returns `<expiresAt>.<hmac>` */
export async function createAdminToken(ttlSeconds = 60 * 60 * 8) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const signature = await crypto.subtle.sign('HMAC', await key(), encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toHex(signature)}`;
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const [expiresRaw, signature] = token.split('.');
  const expiresAt = Number(expiresRaw);

  if (!expiresRaw || !signature || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Date.now()) return false;

  try {
    const expected = await crypto.subtle.sign('HMAC', await key(), encoder.encode(expiresRaw));
    // Fixed-length hex comparison; timing differences here leak nothing useful.
    return toHex(expected) === signature;
  } catch {
    return false;
  }
}

/** Constant-time-ish password check. */
export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected || expected.length < 8) return false;
  if (candidate.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
