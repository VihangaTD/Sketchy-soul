/**
 * PayPal Orders v2 — implemented with plain `fetch`.
 *
 * No SDK on purpose: the REST surface we need is four calls, and this keeps
 * the deployment free of a dependency that changes its API every major version.
 *
 * ⚠️ DEPLOY CHECKLIST
 *   1. PAYPAL_ENV = "live"   (it is "sandbox" by default — sandbox takes no
 *      real money and its credentials do NOT work in live)
 *   2. PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from the LIVE app at
 *      https://developer.paypal.com/dashboard/applications/live
 *   3. PAYPAL_WEBHOOK_ID from the webhook you add to that live app, pointing
 *      at https://your-domain.com/api/webhooks/paypal
 */

const API_BASE = () =>
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const isPayPalConfigured = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export const isPayPalSandbox = () => process.env.PAYPAL_ENV !== 'live';

/* ── Auth ────────────────────────────────────────────────────────────────── */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  // PayPal tokens last ~9 hours; re-using one saves a round trip per checkout.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials are not configured.');

  const res = await fetch(`${API_BASE()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function paypalFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;

  const res = await fetch(`${API_BASE()}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      // Guarantees a retried request never creates a second PayPal order.
      ...(idempotencyKey ? { 'PayPal-Request-Id': idempotencyKey } : {}),
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal ${path} failed (${res.status}): ${text}`);
  }

  return (text ? JSON.parse(text) : {}) as T;
}

/* ── Orders ──────────────────────────────────────────────────────────────── */

export interface PayPalOrder {
  id: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
}

export interface PayPalLineItem {
  name: string;
  /** Whole units as a string, e.g. "120.00" */
  unit_amount: string;
  quantity: string;
  description?: string;
}

export async function createPayPalOrder(params: {
  reference: string;
  currency: string;
  items: PayPalLineItem[];
  itemTotal: number;
  shipping: number;
  total: number;
  returnUrl: string;
  cancelUrl: string;
  customerEmail: string;
}): Promise<PayPalOrder> {
  const money = (minor: number) => (minor / 100).toFixed(2);
  const currency = params.currency.toUpperCase();

  return paypalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    idempotencyKey: params.reference,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          // Shown on the customer's PayPal statement and in our webhook.
          reference_id: params.reference,
          custom_id: params.reference,
          invoice_id: params.reference,
          description: `Hand-drawn portrait commission ${params.reference}`.slice(0, 127),
          amount: {
            currency_code: currency,
            value: money(params.total),
            breakdown: {
              item_total: { currency_code: currency, value: money(params.itemTotal) },
              shipping: { currency_code: currency, value: money(params.shipping) },
            },
          },
          items: params.items.map((item) => ({
            name: item.name.slice(0, 127),
            description: item.description?.slice(0, 127),
            quantity: item.quantity,
            unit_amount: { currency_code: currency, value: item.unit_amount },
            category: 'PHYSICAL_GOODS',
          })),
        },
      ],
      payment_source: {
        paypal: {
          email_address: params.customerEmail,
          experience_context: {
            brand_name: 'Sketchy Soul',
            landing_page: 'NO_PREFERENCE',
            shipping_preference: 'NO_SHIPPING', // we collect the address ourselves
            user_action: 'PAY_NOW',
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
          },
        },
      },
    }),
  });
}

export interface PayPalCapture {
  id: string;
  status: string;
  purchase_units?: {
    payments?: { captures?: { id: string; status: string; amount: { value: string } }[] };
  }[];
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCapture> {
  return paypalFetch<PayPalCapture>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    idempotencyKey: `capture-${orderId}`,
    body: '{}',
  });
}

export async function getPayPalOrder(orderId: string): Promise<PayPalCapture> {
  return paypalFetch<PayPalCapture>(`/v2/checkout/orders/${orderId}`, { method: 'GET' });
}

/** Pull the approval URL the customer must be redirected to. */
export const approvalLink = (order: PayPalOrder) =>
  order.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;

/* ── Webhook verification ────────────────────────────────────────────────── */

/**
 * Asks PayPal to verify the signature of an incoming webhook. Without this
 * anyone who knows the URL could POST a fake "payment completed" event.
 */
export async function verifyPayPalWebhook(params: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const required = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time',
  ];
  if (required.some((h) => !params.headers.get(h))) return false;

  try {
    const result = await paypalFetch<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: params.headers.get('paypal-auth-algo'),
          cert_url: params.headers.get('paypal-cert-url'),
          transmission_id: params.headers.get('paypal-transmission-id'),
          transmission_sig: params.headers.get('paypal-transmission-sig'),
          transmission_time: params.headers.get('paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: JSON.parse(params.rawBody),
        }),
      },
    );

    return result.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}
