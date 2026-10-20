import { getSiteDetails } from '@/lib/cms/contact';
import Link from 'next/link';
import { footerLinks } from '@/lib/site';
import { formatMoney, lowestPrice } from '@/lib/packages';
import { getCatalogue } from '@/lib/cms/catalogue';

export async function SiteFooter() {
  const site = await getSiteDetails();
  const year = new Date().getFullYear();
  const catalogue = await getCatalogue();

  return (
    <footer className="hairline-t bg-charcoal">
      <div className="shell py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p className="font-serif text-[22px] tracking-[2px] text-ivory">
              {site.markPrefix}
              <span className="text-gold">{site.markSuffix}</span>
            </p>
            <p className="lede mt-4 max-w-[34ch]">{site.shortDescription}</p>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
              <a href={`mailto:${site.email}`} className="text-grey transition-colors hover:text-gold-soft">
                {site.email}
              </a>
              {site.phone ? (
                <a
                  href={`tel:${site.phone.replace(/\s/g, '')}`}
                  className="text-grey transition-colors hover:text-gold-soft"
                >
                  {site.phone}
                </a>
              ) : null}
            </div>

            <div className="mt-5 flex gap-4 text-[11px] uppercase tracking-[0.16em]">
              {site.social.instagram ? (
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noreferrer noopener me"
                  className="text-grey transition-colors hover:text-gold"
                >
                  Instagram
                </a>
              ) : null}
              {site.social.whatsapp ? (
                <a
                  href={site.social.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-grey transition-colors hover:text-gold"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <FooterColumn title="Studio" links={footerLinks.studio} />
          <FooterColumn title="Order" links={footerLinks.order} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        <div className="mt-12 flex flex-col items-center gap-5 border-t border-hairline pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[11px] tracking-[0.5px] text-grey">
            © {year} {site.name}. Every portrait drawn by hand.
          </p>

          <span className="price-pill">
            <b className="font-medium text-ivory">From {formatMoney(lowestPrice(catalogue))}</b>
            <Link
              href="/packages"
              className="rounded-full bg-gold px-4 py-2 text-[11px] uppercase tracking-[1px] text-[#141414]"
            >
              See Packages
            </Link>
          </span>
        </div>

        {/* Payment reassurance — measurably lifts checkout completion. */}
        <p className="mt-6 text-center text-[10.5px] uppercase tracking-[0.18em] text-grey/70 sm:text-left">
          Secure payments by Stripe &amp; PayPal · Worldwide tracked delivery
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-[13px] text-grey transition-colors hover:text-gold-soft"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
