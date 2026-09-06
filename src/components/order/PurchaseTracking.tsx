'use client';

import { useEffect } from 'react';
import { trackEvent } from '../Analytics';

/**
 * Fires the GA4 `purchase` event once a commission is confirmed paid.
 *
 * The funnel already reported `begin_checkout` from the order form, but
 * nothing ever reported the sale, so every conversion report ended at "went to
 * payment" and the studio could not tell which package, campaign or medium
 * actually earned money.
 *
 * It has to happen here rather than in the webhook: GA4 attributes a purchase
 * to the visitor's own session, and the webhook is a server-to-server call
 * from Stripe with no browser attached to it.
 */
export function PurchaseTracking({
  reference,
  value,
  packageId,
  packageName,
}: {
  reference: string;
  /** Minor units, as everywhere else in the app. */
  value: number;
  packageId: string;
  packageName: string;
}) {
  useEffect(() => {
    /**
     * Exactly once per order.
     *
     * This page polls itself with router.refresh() while a payment settles and
     * a customer may well revisit the confirmation link, so without a guard the
     * same sale is counted several times. sessionStorage is the right store:
     * it survives the refreshes, and it is gone by the next visit — when the
     * order is long since reported anyway.
     */
    const key = `ss_purchase_sent:${reference}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private browsing with storage disabled — reporting the sale once more
      // is better than never reporting it.
    }

    trackEvent('purchase', {
      transaction_id: reference,
      value: value / 100,
      currency: 'USD',
      items: [{ item_id: packageId, item_name: packageName, quantity: 1, price: value / 100 }],
    });
  }, [reference, value, packageId, packageName]);

  return null;
}
