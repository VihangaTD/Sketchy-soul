'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { prisma } from '@/lib/prisma';
import { sendDigitalDeliveryEmail } from '@/lib/email';
import { getContactDetails } from '@/lib/cms/contact';

export async function sendDigitalOrder(_previous: { message: string; ok: boolean }, form: FormData) {
  await requireAdmin();
  const orderId = String(form.get('orderId') ?? '');
  const digitalDownloadUrl = String(form.get('digitalDownloadUrl') ?? '').trim();
  try {
    const url = new URL(digitalDownloadUrl);
    if (url.protocol !== 'https:' || url.username || url.password || digitalDownloadUrl.length > 2048 || /[\x00-\x20\x7f]/.test(digitalDownloadUrl)) {
      throw new Error('Invalid link');
    }
  } catch {
    return { ok: false, message: 'Enter a valid HTTPS download link (up to 2,048 characters).' };
  }
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'PAID' || order.deliveryType !== 'digital') {
      return { ok: false, message: 'Digital delivery emails are available for paid digital orders only.' };
    }
    if (order.digitalDownloadUrl === digitalDownloadUrl && order.digitalEmailSentAt) {
      return { ok: true, message: 'The delivery email has already been sent for this link.' };
    }
    await prisma.order.update({ where: { id: order.id }, data: { digitalDownloadUrl, digitalEmailSentAt: null } });
    const { email } = await getContactDetails();
    const key = createHash('sha256').update(`${order.id}:${digitalDownloadUrl}`).digest('hex');
    const result = await sendDigitalDeliveryEmail({ ...order, digitalDownloadUrl }, email, `digital-${key}`);
    if (result.skipped) {
      revalidatePath('/admin');
      return { ok: false, message: 'Link saved. Configure RESEND_API_KEY and EMAIL_FROM, then try again.' };
    }
    await prisma.order.update({ where: { id: order.id }, data: { digitalEmailSentAt: new Date() } });
    revalidatePath('/admin');
    return { ok: true, message: `Portrait delivery email sent to ${order.customerEmail}.` };
  } catch {
    revalidatePath('/admin');
    return { ok: false, message: 'Could not complete the delivery email. Check the saved link and try again.' };
  }
}
