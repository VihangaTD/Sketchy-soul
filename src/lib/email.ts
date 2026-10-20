import { site, absoluteUrl } from './site';
import { formatMoney } from './packages';

/**
 * Transactional email via Resend — entirely optional.
 *
 * Leave RESEND_API_KEY empty and sends report `skipped`. Orders can proceed
 * without email; the contact endpoint reports an error when delivery is skipped.
 *
 * ⚠️ DEPLOY: EMAIL_FROM must use a domain you have verified in Resend, or
 * delivery is rejected. ADMIN_NOTIFY_EMAIL is where new-order alerts go.
 */

const isConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

async function send(payload: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!isConfigured()) return { skipped: true as const };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
  return { skipped: false as const };
}

const shell = (body: string) => `
<div style="background:#0a0a0b;padding:32px 16px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#151517;border:1px solid rgba(255,255,255,.08);padding:32px">
    <p style="margin:0 0 24px;font-size:18px;letter-spacing:2px;color:#f2efea">
      ${site.markPrefix}<span style="color:#b8935a">${site.markSuffix}</span>
    </p>
    ${body}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:#8a8a8f">
      ${site.name} · <a href="${absoluteUrl('/')}" style="color:#b8935a">${absoluteUrl('/').replace(/^https?:\/\//, '')}</a>
    </p>
  </div>
</div>`;

export interface OrderEmailData {
  reference: string;
  customerName: string;
  customerEmail: string;
  packageName: string;
  packageSize: string;
  total: number;
  photoCount: number;
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  return send({
    to: order.customerEmail,
    subject: `Your order is confirmed — ${order.reference}`,
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:500;color:#f2efea">
        Thank you, ${escapeHtml(order.customerName.split(' ')[0])}.
      </h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#8a8a8f">
        Your portrait is in the queue. Your preview sketch will arrive within
        ${site.turnaround.preview} — nothing is rendered until you approve it.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#8a8a8f">
        <tr><td style="padding:6px 0">Reference</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.reference)}</td></tr>
        <tr><td style="padding:6px 0">Package</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.packageName)}</td></tr>
        <tr><td style="padding:6px 0">Size</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.packageSize)}</td></tr>
        <tr><td style="padding:6px 0">Reference photos</td><td style="text-align:right;color:#f2efea">${order.photoCount}</td></tr>
        <tr><td style="padding:12px 0 0;border-top:1px solid rgba(255,255,255,.08)">Paid</td><td style="padding:12px 0 0;border-top:1px solid rgba(255,255,255,.08);text-align:right;color:#d9bd8e;font-size:16px">${formatMoney(order.total)}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#8a8a8f">
        Reply to this email with anything you forgot to mention — extra photos
        are always welcome.
      </p>
    `),
  });
}

export async function sendAdminOrderAlert(order: OrderEmailData & { photos: string[] }) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return { skipped: true as const };

  return send({
    to,
    replyTo: order.customerEmail,
    subject: `New order ${order.reference} — ${formatMoney(order.total)}`,
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:500;color:#f2efea">New order paid</h1>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#8a8a8f">
        <tr><td style="padding:6px 0">Reference</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.reference)}</td></tr>
        <tr><td style="padding:6px 0">Customer</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.customerName)}</td></tr>
        <tr><td style="padding:6px 0">Email</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.customerEmail)}</td></tr>
        <tr><td style="padding:6px 0">Package</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.packageName)} · ${escapeHtml(order.packageSize)}</td></tr>
        <tr><td style="padding:6px 0">Total</td><td style="text-align:right;color:#d9bd8e">${formatMoney(order.total)}</td></tr>
      </table>
      <p style="margin:20px 0 8px;font-size:12px;color:#8a8a8f">Reference photos</p>
      ${order.photos
        .map(
          (url, i) =>
            `<p style="margin:0 0 4px;font-size:12px"><a href="${escapeHtml(url)}" style="color:#b8935a">Photo ${i + 1}</a></p>`,
        )
        .join('')}
    `),
  });
}

/** Contact enquiries go to the public contact email, with replies to the client. */
export async function sendContactMessage(message: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}, to: string) {
  return send({
    to,
    replyTo: message.email,
    subject: `Contact enquiry: ${message.subject}`,
    html: shell(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#f2efea">New contact message</h1>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#8a8a8f">
        <tr><th style="padding:6px 0;text-align:left">Name</th><td>${escapeHtml(message.name)}</td></tr>
        <tr><th style="padding:6px 0;text-align:left">Email</th><td>${escapeHtml(message.email)}</td></tr>
        <tr><th style="padding:6px 0;text-align:left">Phone / WhatsApp</th><td>${escapeHtml(message.phone || 'Not provided')}</td></tr>
        <tr><th style="padding:6px 0;text-align:left">Subject</th><td>${escapeHtml(message.subject)}</td></tr>
      </table>
      <div style="margin-top:20px;font-size:14px;line-height:1.7;color:#f2efea;overflow-wrap:anywhere">
        ${escapeHtml(message.message).replace(/\r\n|\r|\n/g, '<br>')}
      </div>
      <p style="margin-top:24px;font-size:12px;color:#8a8a8f">Reply to this email to respond to the client.</p>
    `),
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
