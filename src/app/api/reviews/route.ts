import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const schema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^SS-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/, 'Enter your order reference, for example SS-7F3K2Q.'),
  author: z.string().trim().min(2, 'Enter your name.').max(80),
  rating: z.number().int().min(1).max(5),
  quote: z.string().trim().min(10, 'Please write at least 10 characters.').max(600),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to publish your review.' }) }),
  company: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(`review:${clientIp(request.headers)}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const data = parsed.data;
    // Never reveal customer information based on a reference in a public URL.
    const order = await prisma.order.findUnique({ where: { reference: data.reference }, select: { status: true } });
    if (!order || order.status !== 'PAID') return NextResponse.json({ error: 'Please enter a valid reference for a paid order. You can find it in your order email.' }, { status: 400 });
    await prisma.testimonial.create({ data: {
      orderReference: data.reference,
      author: data.author,
      quote: data.quote,
      rating: data.rating,
      meta: 'Portrait customer',
      placeholder: false,
      published: false,
    } });
    return NextResponse.json({ message: 'Thank you for sharing your experience. Your review has been submitted.' }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'A review has already been submitted for this order. Contact the studio if you would like to update it.' }, { status: 409 });
    return NextResponse.json({ error: 'We could not save your review. Please try again.' }, { status: 500 });
  }
}
