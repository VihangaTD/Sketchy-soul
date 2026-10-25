'use client';

import { useActionState } from 'react';
import { deleteOrder } from '@/app/admin/order-actions';

export function DeleteOrderButton({ orderId, reference }: { orderId: string; reference: string }) {
  const [state, action, pending] = useActionState(deleteOrder, { message: '' });
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(`Permanently delete order ${reference} and its order history? This does not refund the payment or delete uploaded photos or reviews.`)) event.preventDefault();
    }} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="reference" value={reference} />
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded border border-[#c2564f]/50 px-4 py-2 text-xs text-[#e08b84] transition-colors hover:bg-[#c2564f]/10 disabled:opacity-50 sm:w-auto">
        {pending ? 'Deleting…' : 'Delete order'}
      </button>
      {state.message ? <p role="alert" className="text-xs text-[#e08b84]">{state.message}</p> : null}
    </form>
  );
}
