import Link from 'next/link';
import type { Metadata } from 'next';

import { Clause, LegalPage } from '@/components/LegalPage';
import { formatMoney } from '@/lib/packages';
import { getCatalogue } from '@/lib/cms/catalogue';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: 'Shipping & Returns',
  description:
    'Worldwide tracked delivery for hand-drawn portraits — rolled, framed or digital. Packaging, timings, customs duties, damage claims and the returns policy.',
  path: '/shipping',
  keywords: ['portrait shipping worldwide', 'artwork delivery', 'framed artwork shipping'],
});

export default async function ShippingPage() {
  const { deliveryOptions } = await getCatalogue();

  return (
    <LegalPage
      eyebrow="Getting It To You"
      title="Shipping & Returns"
      page="shipping"
      path="/shipping"
      description="Worldwide tracked delivery for hand-drawn portraits — rolled, framed or digital. Packaging, timings, customs duties, damage claims and the returns policy."
    >
      <p>
        Portraits ship from {site.location.city}, {site.location.countryName} to
        anywhere in the world, tracked and insured. Digital delivery is instant
        and free.
      </p>

      <Clause heading="Delivery options">
        <ul className="ml-4 list-disc space-y-2">
          {deliveryOptions.map((option) => (
            <li key={option.id}>
              <b className="text-ivory">{option.name}</b>{' '}
              <span className="text-gold-soft">
                {option.price === 0 ? '— included' : `— ${formatMoney(option.price)}`}
              </span>
              <br />
              {option.description}
            </li>
          ))}
        </ul>
      </Clause>

      <Clause heading="How work is packed">
        <p>
          Rolled originals travel interleaved with acid-free tissue inside a
          rigid postal tube with sealed end caps. Framed pieces are wrapped in
          foam, corner-protected and boxed in a double-walled carton; glass is
          replaced with shatterproof acrylic on anything shipping outside the
          region. Every parcel is marked fragile and requires a signature.
        </p>
      </Clause>

      <Clause heading="Timings">
        <p>
          Production takes {site.turnaround.standard} from sketch approval
          ({site.turnaround.rush} with the rush add-on). Transit is typically
          3–5 working days regionally and 7–14 days internationally. You receive
          a tracking number the moment the parcel is collected.
        </p>
      </Clause>

      <Clause heading="Customs, duties and taxes">
        <p>
          Original artwork often attracts a reduced or zero rate of duty, but
          rules differ by country. Any import duty, VAT or handling fee charged
          by the destination country is payable by the recipient. Parcels are
          declared honestly at their commissioned value — we cannot mark an
          order as a gift or under-declare it.
        </p>
      </Clause>

      <Clause heading="Damage in transit">
        <p>
          Photograph the packaging and the artwork as you found it and email us
          within 14 days of delivery. Every shipment is insured: a damaged piece
          is remade at no cost, or refunded in full, whichever you prefer.
        </p>
      </Clause>

      <Clause heading="Returns">
        <p>
          Because each portrait is drawn to your personal specification, it
          cannot be resold and is therefore not returnable for change of mind.
          What protects you instead is the preview-sketch stage — nothing is
          rendered until you have approved the likeness, and a full refund is
          available at any point before that. The complete policy is in the{' '}
          <Link href="/terms" className="text-gold-soft underline-offset-4 hover:underline">
            terms of service
          </Link>
          .
        </p>
      </Clause>

      <Clause heading="Wrong address">
        <p>
          Check your delivery address on the order confirmation email. If it is
          wrong, tell us before the piece ships and it will be corrected for
          free. Re-shipping a parcel returned because of an incorrect address is
          charged at cost.
        </p>
      </Clause>
    </LegalPage>
  );
}
