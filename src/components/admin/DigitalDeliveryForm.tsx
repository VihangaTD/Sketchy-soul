'use client';

import { useActionState } from 'react';
import { sendDigitalOrder } from '@/app/admin/digital-actions';

export function DigitalDeliveryForm({ orderId, downloadUrl, sentAt }: {
  orderId: string;
  downloadUrl: string | null;
  sentAt: string | null;
}) {
  const [state, action, pending] = useActionState(sendDigitalOrder, { message: '', ok: false });
  return (
    <form action={action} className="w-full min-w-0 max-w-xl space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block text-[11px] text-grey" htmlFor={`digital-${orderId}`}>Portrait download link</label>
      <input id={`digital-${orderId}`} name="digitalDownloadUrl" type="url" className="field min-w-0 max-w-full !px-3 !py-2.5 sm:!px-4 sm:!py-3" required maxLength={2048}
        defaultValue={downloadUrl ?? ''} placeholder="https://…" disabled={pending} />
      <p className="text-[11px] text-grey">Make sure the customer has permission to download the file.</p>
      <button type="submit" className="btn-primary btn-sm min-h-11 w-full max-w-full !whitespace-normal !px-3 !py-2.5 !text-[10px] !leading-relaxed !tracking-[0.06em] sm:w-auto sm:!px-5 sm:!py-3 sm:!text-[11px] sm:!tracking-[0.12em] disabled:opacity-60" disabled={pending}>
        {pending ? 'Sending…' : sentAt ? 'Resend portrait email' : 'Save & send portrait email'}
      </button>
      {sentAt ? <p className="text-[11px] text-grey">Email sent: {sentAt.slice(0, 16).replace('T', ' ')} UTC</p> : null}
      {state.message ? <p role="status" className={`break-words text-[12px] ${state.ok ? 'text-gold-soft' : 'text-[#e08b84]'}`}>{state.message}</p> : null}
    </form>
  );
}
