'use client';

import { useActionState } from 'react';
import { sendOrderShipment } from '@/app/admin/shipping-actions';

export function ShippingForm({ orderId, trackingNumber, sentAt }: {
  orderId: string;
  trackingNumber: string | null;
  sentAt: string | null;
}) {
  const [state, action, pending] = useActionState(sendOrderShipment, { message: '', ok: false });
  return (
    <form action={action} className="min-w-[240px] max-w-[280px] space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block text-[11px] text-grey" htmlFor={`tracking-${orderId}`}>Tracking number</label>
      <input id={`tracking-${orderId}`} name="trackingNumber" className="field" required maxLength={120}
        defaultValue={trackingNumber ?? ''} placeholder="Enter tracking number" disabled={pending} />
      <button type="submit" className="btn-primary btn-sm" disabled={pending}>
        {pending ? 'Sending…' : 'Save & send shipping email'}
      </button>
      {sentAt ? <p className="text-[11px] text-grey">Email sent: {sentAt.slice(0, 16).replace('T', ' ')} UTC</p> : null}
      {state.message ? <p role="status" className={`text-[12px] ${state.ok ? 'text-gold-soft' : 'text-[#e08b84]'}`}>{state.message}</p> : null}
    </form>
  );
}
