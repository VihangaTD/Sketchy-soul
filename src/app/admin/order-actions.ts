'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { prisma } from '@/lib/prisma';

export async function deleteOrder(_previous: { message: string }, form: FormData) {
  await requireAdmin();
  const id = String(form.get('orderId') ?? '');
  const reference = String(form.get('reference') ?? '');
  if (!id || !reference) return { message: 'Could not identify the order.' };
  try {
    // Order events cascade with the record. Payments, reviews and uploaded files remain.
    await prisma.order.deleteMany({ where: { id, reference } });
    revalidatePath('/admin');
    return { message: '' };
  } catch {
    return { message: 'Could not delete this order. Please try again.' };
  }
}
