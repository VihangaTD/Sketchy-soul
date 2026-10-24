'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function OrderFilters({ type, payment, delivery }: { type: string; payment: string; delivery: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const filters = [
    { name: 'type', label: 'Delivery type', value: type, options: [['all', 'All types'], ['rolled', 'Rolled'], ['digital', 'Digital'], ['framed', 'Framed']] },
    { name: 'payment', label: 'Payment status', value: payment, options: [['all', 'All payments'], ['PAID', 'Paid'], ['AWAITING_PAYMENT', 'Awaiting payment'], ['DRAFT', 'Draft'], ['FAILED', 'Failed'], ['CANCELLED', 'Cancelled'], ['REFUNDED', 'Refunded']] },
    { name: 'delivery', label: 'Delivery status', value: delivery, options: [['all', 'All delivery statuses'], ['pending', 'Awaiting delivery (paid)'], ['shipped', 'Shipped (rolled)'], ['link_sent', 'Link sent (digital)']] },
  ];
  return (
    <div className="mb-5 grid gap-3 rounded-lg border border-hairline bg-white/[0.02] p-4 sm:grid-cols-3" aria-busy={pending}>
      {filters.map((filter) => (
        <label key={filter.name} className="min-w-0 space-y-2 text-xs text-grey">
          <span className="block">{filter.label}</span>
          <select value={filter.value} disabled={pending} onChange={(event) => {
            const next = new URLSearchParams(params.toString());
            if (event.target.value === 'all') next.delete(filter.name);
            else next.set(filter.name, event.target.value);
            startTransition(() => router.replace(`/admin?${next.toString()}`, { scroll: false }));
          }} className="w-full rounded border border-hairline bg-[#151517] px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none disabled:opacity-60">
            {filter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
