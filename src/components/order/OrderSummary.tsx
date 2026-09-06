'use client';

import { formatMoney, type PricedOrder } from '@/lib/packages';

/**
 * Live order summary. Recalculated from the same `priceOrder()` function the
 * server uses, so what the customer sees here is exactly what they are
 * charged — no drift between the two.
 */
export function OrderSummary({
  priced,
  compact = false,
}: {
  priced: PricedOrder;
  compact?: boolean;
}) {
  return (
    <div className={compact ? '' : 'panel p-6'}>
      {!compact ? <p className="eyebrow mb-4">Your Order</p> : null}

      <ul className="space-y-3">
        {priced.lines.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-4">
            <span className="text-[13px] leading-snug text-grey">
              {line.label}
              {line.meta ? (
                <span className="mt-0.5 block text-[11px] text-grey/70">{line.meta}</span>
              ) : null}
            </span>
            <span className="shrink-0 font-sans text-[13px] text-ivory">
              {formatMoney(line.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-hairline pt-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-grey">Total</span>
        <span className="font-serif text-[26px] text-gold-soft">
          {formatMoney(priced.total)}{' '}
          <span className="font-sans text-[11px] tracking-[0.5px] text-grey">USD</span>
        </span>
      </div>

      <ul className="mt-5 space-y-2 border-t border-hairline pt-4 text-[11.5px] leading-relaxed text-grey">
        <li>Preview sketch before any rendering begins</li>
        <li>Turnaround {priced.pkg.turnaround} from sketch approval</li>
        <li>Full refund available until the sketch is approved</li>
      </ul>
    </div>
  );
}
