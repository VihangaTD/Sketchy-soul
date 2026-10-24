'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function OrderLimitSelect({ limit }: { limit: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <select id="order-limit" name="limit" value={limit} disabled={pending}
      aria-label="Show last orders" aria-busy={pending}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('limit', event.target.value);
        startTransition(() => router.replace(`/admin?${params.toString()}`, { scroll: false }));
      }}
      className="rounded border border-hairline bg-[#151517] px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none disabled:opacity-60">
      {[10, 25, 50, 100].map((count) => <option key={count} value={count}>{count} orders</option>)}
    </select>
  );
}
