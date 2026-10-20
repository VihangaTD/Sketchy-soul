import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { appendContactToSheet } from '@/lib/orders';
import { CONTACT_SUBJECTS, contactSchema, fieldErrors } from '@/lib/validation';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getContactDetails } from '@/lib/cms/contact';
import { sendContactMessage } from '@/lib/email';

/**
 * POST /api/contact — contact form and custom-quote requests.
 * Saved in Postgres, emailed to the saved contact address, and mirrored to Sheets.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You have sent several messages already — please wait a little while.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  // Honeypot — answer 200 so the bot believes it succeeded and moves on.
  if (typeof body.company === 'string' && body.company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const saved = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
      },
    });

    // Sheet availability must not block or determine email delivery.
    const [delivery, sheet] = await Promise.allSettled([
      getContactDetails().then(({ email }) => sendContactMessage({
        ...data,
        subject: CONTACT_SUBJECTS.find((item) => item.value === data.subject)?.label ?? data.subject,
      }, email)),
      (async () => {
        const sync = await appendContactToSheet(data);
        if (sync.ok) {
          await prisma.contactMessage.update({
            where: { id: saved.id },
            data: { sheetStatus: 'SYNCED' },
          });
        }
      })(),
    ]);

    if (sheet.status === 'rejected') console.error('[contact] Sheet backup failed.');

    if (delivery.status === 'rejected' || delivery.value.skipped) {
      console.error('[contact] Email delivery failed or is not configured.');
      return NextResponse.json(
        { error: 'Your message was saved, but email delivery failed. Please email the studio directly.' },
        { status: delivery.status === 'rejected' ? 502 : 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact] Failed to save message:', error);
    return NextResponse.json(
      { error: 'We could not send that. Please email the studio directly.' },
      { status: 500 },
    );
  }
}
