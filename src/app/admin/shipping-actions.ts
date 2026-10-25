'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { prisma } from '@/lib/prisma';
import { sendShipmentEmail } from '@/lib/email';
import { getContactDetails } from '@/lib/cms/contact';

export async function sendOrderShipment(_previous: { message: string; ok: boolean }, form: FormData) {
  await requireAdmin();
  const orderId = String(form.get('orderId') ?? '');
  const trackingNumber = String(form.get('trackingNumber') ?? '').trim();
  const digitalDownloadUrl = String(form.get('digitalDownloadUrl') ?? '').trim() || null;
  if (digitalDownloadUrl) {
    try {
      const url = new URL(digitalDownloadUrl);
      if (url.protocol !== 'https:' || url.username || url.password || digitalDownloadUrl.length > 2048 || /[\x00-\x20\x7f]/.test(digitalDownloadUrl)) throw new Error('Invalid link');
    } catch {
      return { ok: false, message: 'Enter a valid HTTPS digital-copy link, or leave it blank.' };
    }
  }
  if (!trackingNumber || trackingNumber.length > 120 || /[\x00-\x1f\x7f]/.test(trackingNumber)) {
    return { ok: false, message: 'Enter a tracking number of up to 120 characters.' };
  }
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'PAID' || order.deliveryType !== 'rolled') {
      return { ok: false, message: 'Shipping emails are available for paid rolled orders only.' };
    }
    await prisma.order.update({ where: { id: order.id }, data: { trackingNumber, digitalDownloadUrl, shipmentEmailSentAt: order.trackingNumber === trackingNumber && order.digitalDownloadUrl === digitalDownloadUrl ? order.shipmentEmailSentAt : null } });
    const { email } = await getContactDetails();
    const key = createHash('sha256').update(JSON.stringify([order.id, trackingNumber, digitalDownloadUrl, order.shipmentEmailSentAt?.toISOString() ?? 'initial'])).digest('hex');
    const result = await sendShipmentEmail({ ...order, trackingNumber, digitalDownloadUrl }, email, `shipment-${key}`);
    if (result.skipped) {
      revalidatePath('/admin');
      return { ok: false, message: 'Tracking saved. Email is not configured; set RESEND_API_KEY and EMAIL_FROM, then try again.' };
    }
    await prisma.order.update({ where: { id: order.id }, data: { shipmentEmailSentAt: new Date() } });
    revalidatePath('/admin');
    return { ok: true, message: `Shipment email sent to ${order.customerEmail}.` };
  } catch {
    return { ok: false, message: 'Could not complete the shipment notification. Check the saved tracking number and try again.' };
  }
}
