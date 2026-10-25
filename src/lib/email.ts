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

async function send(payload: { to: string; subject: string; html: string; replyTo?: string; idempotencyKey?: string }) {
  if (!isConfigured()) return { skipped: true as const };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {}),
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

function reviewInvitation(reference: string) {
  const url = escapeHtml(absoluteUrl(`/review?ref=${encodeURIComponent(reference)}`));
  return `<div style="margin-top:28px;padding-top:24px;border-top:1px solid #303033">
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:500;color:#f2efea">How did we do?</h2>
    <p style="margin:0 0 18px;font-size:13px;line-height:1.8;color:#c4c0ba">Once you’ve had a chance to enjoy your portrait, we’d love to hear your thoughts. Your order reference is already filled in.</p>
    <a href="${url}" style="display:inline-block;padding:12px 22px;border:1px solid #b8935a;color:#d9bd8e;font-size:13px;text-decoration:none">Add your review</a>
    <p style="margin:14px 0 0;font-size:11px;line-height:1.7;color:#8a8a8f">Or open: <a href="${url}" style="color:#d9bd8e;word-break:break-all">${url}</a></p>
  </div>`;
}

export async function sendShipmentEmail(order: {
  reference: string;
  customerName: string;
  customerEmail: string;
  packageName: string;
  packageSize: string;
  trackingNumber: string;
  digitalDownloadUrl?: string | null;
}, replyTo: string, idempotencyKey: string) {
  return send({
    to: order.customerEmail,
    replyTo,
    idempotencyKey,
    subject: `Your portrait has shipped — ${order.reference}`,
    html: shell(`
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d9bd8e">From our studio to your home</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:500;color:#f2efea">Your portrait is on its way.</h1>
      <p style="font-size:14px;line-height:1.8;color:#c4c0ba">Hi ${escapeHtml(order.customerName.split(' ')[0])},<br>
        Your portrait has been carefully packed, and shipped. We can’t wait for it to arrive at its new home.</p>
      <div style="margin:28px 0;padding:24px;background:#0a0a0b;border:1px solid #b8935a">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d9bd8e">Your tracking number</p>
        <p style="margin:0;font-family:monospace;font-size:20px;line-height:1.5;word-break:break-all;color:#f2efea">${escapeHtml(order.trackingNumber)}</p>
      </div>
      <table role="presentation" style="width:100%;font-size:13px;line-height:1.8;color:#c4c0ba">
        <tr><td>Order reference</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.reference)}</td></tr>
        <tr><td>Portrait</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.packageName)} · ${escapeHtml(order.packageSize)}</td></tr>
        <tr><td>Delivery</td><td style="text-align:right;color:#f2efea">Shipped</td></tr>
      </table>
      ${order.digitalDownloadUrl ? `
      <table role="presentation" style="width:100%;margin:24px 0;border:1px solid #b8935a;background:#0a0a0b">
        <tr><td style="padding:24px;text-align:center">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:500;color:#f2efea">Your digital copy is ready, too.</h2>
          <p style="margin:0 0 20px;font-size:13px;line-height:1.8;color:#c4c0ba">Enjoy your portrait while your original makes its way to you. Open the link below and save your digital copy.</p>
          <a href="${escapeHtml(order.digitalDownloadUrl)}" style="display:inline-block;padding:14px 22px;background:#d9bd8e;color:#151517;font-size:14px;font-weight:bold;text-decoration:none">Download your digital copy</a>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:#8a8a8f">If the button does not open, use this link:<br><a href="${escapeHtml(order.digitalDownloadUrl)}" style="color:#d9bd8e;word-break:break-all">${escapeHtml(order.digitalDownloadUrl)}</a></p>
        </td></tr>
      </table>` : ''}
      <p style="margin:24px 0;font-size:13px;line-height:1.8;color:#c4c0ba">Tracking updates may take a little time to appear after dispatch. If you need help with your delivery, simply reply to this email.</p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#d9bd8e">Thank you for choosing Sketchy Soul.<br>A little piece of our studio is now on its way to you.</p>
      ${reviewInvitation(order.reference)}
    `),
  });
}

export async function sendDigitalDeliveryEmail(order: {
  reference: string;
  customerName: string;
  customerEmail: string;
  packageName: string;
  packageSize: string;
  digitalDownloadUrl: string;
}, replyTo: string, idempotencyKey: string) {
  return send({
    to: order.customerEmail,
    replyTo,
    idempotencyKey,
    subject: `Your portrait is ready — ${order.reference}`,
    html: shell(`
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d9bd8e">Made by hand. Ready to treasure.</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:500;color:#f2efea">Your portrait is ready.</h1>
      <p style="font-size:14px;line-height:1.8;color:#c4c0ba">Hi ${escapeHtml(order.customerName.split(' ')[0])},<br>
        Your portrait is complete, and we’re delighted to share it with you. Thank you for trusting Sketchy Soul to turn your special memory into art.</p>
      <table role="presentation" style="width:100%;margin:28px 0;background:#0a0a0b;border:1px solid #b8935a">
        <tr><td style="padding:28px 20px;text-align:center">
          <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#f2efea">A portrait to keep, share, and make your own.</p>
          <a href="${escapeHtml(order.digitalDownloadUrl)}" style="display:inline-block;padding:15px 24px;background:#d9bd8e;color:#151517;font-size:14px;font-weight:bold;text-decoration:none">Download your portrait</a>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#c4c0ba">Open the link and save the original file to your device.</p>
        </td></tr>
      </table>
      <table role="presentation" style="width:100%;font-size:13px;line-height:1.8;color:#c4c0ba">
        <tr><td>Order reference</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.reference)}</td></tr>
        <tr><td>Portrait</td><td style="text-align:right;color:#f2efea">${escapeHtml(order.packageName)} · ${escapeHtml(order.packageSize)}</td></tr>
        <tr><td>Delivery</td><td style="text-align:right;color:#f2efea">Digital download</td></tr>
      </table>
      <p style="margin:24px 0;font-size:13px;line-height:1.8;color:#c4c0ba">Having trouble opening your portrait? Reply to this email and we’ll help you access your file.</p>
      <p style="font-size:12px;line-height:1.7;color:#8a8a8f">If the button doesn’t open, use this link:<br>
        <a href="${escapeHtml(order.digitalDownloadUrl)}" style="color:#d9bd8e;word-break:break-all">${escapeHtml(order.digitalDownloadUrl)}</a></p>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#d9bd8e">With care,<br>The Sketchy Soul studio</p>
      ${reviewInvitation(order.reference)}
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
