import type { Metadata } from 'next';

import { Clause, LegalPage } from '@/components/LegalPage';
import { COOKIE_REGISTRY } from '@/lib/cookies';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: 'Privacy & Cookie Policy',
  description:
    'What data Sketchy Soul collects when you commission a portrait, how your reference photos are stored, which cookies are set, and how to have your data deleted.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your Data"
      title="Privacy & Cookies"
      page="privacy"
      path="/privacy"
      description="What data Sketchy Soul collects when you commission a portrait, how your reference photos are stored, which cookies are set, and how to have your data deleted."
    >
      <p>
        This page explains, in plain terms, what {site.name} collects, why, and
        what you can do about it. The short version: we collect what is needed
        to draw your portrait and get it to you, and nothing else.
      </p>

      <Clause heading="Who is responsible">
        <p>
          {site.name} is the data controller for information collected through
          this website. Contact:{' '}
          <a href={`mailto:${site.email}`} className="text-gold-soft">
            {site.email}
          </a>
          .
        </p>
      </Clause>

      <Clause heading="What we collect">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <b className="text-ivory">Order details</b> — your name, email,
            phone (if given), delivery address for physical orders, and the
            brief you write.
          </li>
          <li>
            <b className="text-ivory">Reference photographs</b> — the images you
            upload for the artist to work from.
          </li>
          <li>
            <b className="text-ivory">Payment confirmation</b> — the provider,
            transaction id and amount. We never see or store your card number.
          </li>
          <li>
            <b className="text-ivory">Messages</b> — anything you send through
            the contact form.
          </li>
          <li>
            <b className="text-ivory">Analytics</b> — only if you accept
            analytics cookies. Anonymous page views and referral source.
          </li>
        </ul>
      </Clause>

      <Clause heading="Why we are allowed to hold it">
        <p>
          Order details and photographs: to perform the contract you entered
          into when you commissioned the artwork. Analytics: your consent, which
          you can withdraw at any time. Payment records: a legal obligation to
          keep transaction records for tax purposes.
        </p>
      </Clause>

      <Clause heading="Who else sees it">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <b className="text-ivory">Stripe / PayPal</b> — process your payment
            on their own secure pages.
          </li>
          <li>
            <b className="text-ivory">Vercel</b> — hosts the site and stores
            uploaded photographs.
          </li>
          <li>
            <b className="text-ivory">Google</b> — the studio&apos;s order sheet
            lives in Google Sheets, and analytics (if accepted) is Google
            Analytics.
          </li>
          <li>
            <b className="text-ivory">The courier</b> — receives your delivery
            address for physical orders only.
          </li>
        </ul>
        <p>Your data is never sold, rented or used to train any model.</p>
      </Clause>

      <Clause heading="How long it is kept">
        <p>
          Reference photographs are deleted twelve months after the commission
          is delivered, or immediately on request once the artwork is finished.
          Order and payment records are kept for seven years because tax law
          requires it. Contact messages are deleted after two years.
        </p>
      </Clause>

      <Clause heading="Your rights">
        <p>
          You can ask for a copy of everything we hold about you, ask for it to
          be corrected, or ask for it to be deleted. Email{' '}
          <a href={`mailto:${site.email}`} className="text-gold-soft">
            {site.email}
          </a>{' '}
          and you will get a response within 30 days. If you are in the EU or
          UK, you also have the right to complain to your national data
          protection authority.
        </p>
      </Clause>

      <Clause heading="Cookies we set">
        <p>
          Cookies in the &ldquo;strictly necessary&rdquo; category are set
          because the site cannot work without them. Everything else waits for
          you to press Accept, and nothing analytics-related loads if you
          decline.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="py-3 pr-4 text-[10.5px] uppercase tracking-[0.14em] text-grey">
                  Cookie
                </th>
                <th scope="col" className="py-3 pr-4 text-[10.5px] uppercase tracking-[0.14em] text-grey">
                  Category
                </th>
                <th scope="col" className="py-3 pr-4 text-[10.5px] uppercase tracking-[0.14em] text-grey">
                  Purpose
                </th>
                <th scope="col" className="py-3 text-[10.5px] uppercase tracking-[0.14em] text-grey">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_REGISTRY.map((cookie) => (
                <tr key={cookie.name} className="border-b border-hairline align-top">
                  <td className="py-3 pr-4 font-mono text-[11.5px] text-ivory">{cookie.name}</td>
                  <td className="py-3 pr-4 text-grey">{cookie.category}</td>
                  <td className="py-3 pr-4 text-grey">{cookie.purpose}</td>
                  <td className="py-3 text-grey">{cookie.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          To change your mind, clear this site&apos;s cookies in your browser —
          the consent banner will appear again on your next visit.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          The site is not intended for children under 16, and we do not
          knowingly collect their data. Portraits of children are of course
          welcome — commissioned by an adult, from photographs that adult has
          the right to share.
        </p>
      </Clause>
    </LegalPage>
  );
}
