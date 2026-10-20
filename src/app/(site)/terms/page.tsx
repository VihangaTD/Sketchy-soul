import { getSiteDetails } from '@/lib/cms/contact';
import Link from 'next/link';
import type { Metadata } from 'next';

import { Clause, LegalPage } from '@/components/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'Commission terms for Sketchy Soul: what is included, revisions, refunds, copyright and licensing of hand-drawn portrait artwork.',
  path: '/terms',
});

/**
 * ⚠️ BEFORE LAUNCH: have these reviewed against the consumer law of the
 * country you trade from. They are a solid, honest starting point written for
 * a small art studio — they are not legal advice. Fill in the placeholders
 * marked [ ] with your registered details.
 */
export default async function TermsPage() {
  const site = await getSiteDetails();
  return (
    <LegalPage
      eyebrow="The Fine Print"
      title="Terms of Service"
      page="terms"
      path="/terms"
      description="Commission terms for Sketchy Soul: what is included, revisions, refunds, copyright and licensing of hand-drawn portrait artwork."
    >
      <p>
        These terms apply when you commission artwork from {site.name}
        (&ldquo;the studio&rdquo;, &ldquo;we&rdquo;). Placing an order means you
        accept them. Nothing here removes rights you have under the consumer law
        of your own country.
      </p>

      <Clause heading="1. What you are buying">
        <p>
          A bespoke, hand-drawn portrait produced from reference photographs you
          supply. Each package lists the paper size, the number of subjects
          included, the number of revision rounds and the expected turnaround.
          Artwork is drawn by hand; it is an interpretation of your photograph,
          not a mechanical reproduction of it.
        </p>
      </Clause>

      <Clause heading="2. Reference photographs">
        <p>
          By uploading a photograph you confirm that you own it or have the
          right to have it reproduced, and that any person shown consents to
          being drawn. The studio will refuse commissions where this is in
          doubt. You keep all rights in your photograph; we use it solely to
          produce your artwork.
        </p>
      </Clause>

      <Clause heading="3. Payment">
        <p>
          Commissions are paid in full at the time of ordering, in US dollars,
          through Stripe or PayPal. Card details are handled entirely by those
          providers and never reach our servers. Work begins once payment is
          confirmed.
        </p>
      </Clause>

      <Clause heading="4. The preview sketch">
        <p>
          Within {site.turnaround.preview} of payment you receive a preview
          sketch. This is the point at which composition and likeness are
          agreed. If the likeness cannot be resolved to your satisfaction at the
          sketch stage, the commission is cancelled and refunded in full.
        </p>
      </Clause>

      <Clause heading="5. Revisions">
        <p>
          Each package includes the revision rounds listed on the packages page.
          Revisions cover likeness, tone and detail. Requests that change the
          agreed composition, add subjects or change the size are treated as a
          new commission and quoted separately.
        </p>
      </Clause>

      <Clause heading="6. Cancellation and refunds">
        <ul className="ml-4 list-disc space-y-2">
          <li>Before the preview sketch is sent — full refund, no questions.</li>
          <li>
            After the sketch is approved and rendering has begun — a partial
            refund of 50% is available, reflecting hours already worked.
          </li>
          <li>
            Once the finished piece has been photographed and sent for approval
            — no refund, though revisions still apply.
          </li>
          <li>
            Artwork damaged or lost in transit is remade or refunded in full.
            Report it within 14 days of delivery with photographs.
          </li>
        </ul>
        <p>
          Because every piece is made to your personal specification, statutory
          &ldquo;change of mind&rdquo; cooling-off rights for distance selling
          do not generally apply to bespoke goods. The policy above is offered
          voluntarily and is more generous than the legal minimum in most
          markets.
        </p>
      </Clause>

      <Clause heading="7. Delivery">
        <p>
          Turnaround estimates run from the date the preview sketch is approved,
          not the order date. Shipping times are outside our control once a
          parcel is with the courier. Import duties and taxes in the destination
          country are the recipient&apos;s responsibility. See the{' '}
          <Link href="/shipping" className="text-gold-soft underline-offset-4 hover:underline">
            shipping and returns policy
          </Link>{' '}
          for detail.
        </p>
      </Clause>

      <Clause heading="8. Copyright and portfolio use">
        <p>
          You own the physical artwork and receive a licence to use the digital
          file for personal purposes, including personal prints and social
          media. The artist retains copyright in the drawing itself. Commercial
          use — merchandise, advertising, resale of reproductions — requires
          separate written permission.
        </p>
        <p>
          The studio may photograph finished work for its portfolio and social
          media. You can opt out of this on the order form, and we will honour
          it permanently.
        </p>
      </Clause>

      <Clause heading="9. Limitation of liability">
        <p>
          Our liability for any commission is limited to the amount you paid for
          it. We are not liable for indirect or consequential loss, such as a
          missed gift-giving occasion, though we will always work with you to
          meet a stated deadline.
        </p>
      </Clause>

      <Clause heading="10. Contact and governing law">
        <p>
          Questions about these terms: <a href={`mailto:${site.email}`} className="text-gold-soft">{site.email}</a>.
        </p>
        <p>
          These terms are governed by the laws of [ your country ], and disputes
          are subject to the courts of [ your city ]. Trading name: [ registered
          business name ]. Registration number: [ if applicable ].
        </p>
      </Clause>
    </LegalPage>
  );
}
