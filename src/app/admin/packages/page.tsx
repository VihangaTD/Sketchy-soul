import Link from 'next/link';

import { SectionHead } from '@/components/SectionHead';
import { Actions, Danger, Disclosure, Save } from '@/components/admin/Fields';
import {
  AddOnFields,
  DeliveryFields,
  PackageFields,
  StyleFields,
} from '@/components/admin/CatalogueFields';
import { listCatalogueForAdmin } from '@/lib/cms/catalogue';
import { listMedia } from '@/lib/cms/media';
import { formatMoney } from '@/lib/packages';

import {
  createPackage,
  deleteAddOn,
  deleteDelivery,
  deletePackage,
  deleteStyle,
  saveAddOn,
  saveDelivery,
  saveStyle,
  updatePackage,
} from './actions';

/**
 * Packages & pricing.
 *
 * Saving here changes what the next customer is charged — the checkout route
 * re-prices every order from these exact rows. There is no draft state.
 *
 * Each record is a collapsed row you open to edit, and the "Add a …" row sits
 * at the top of its section so it is reachable without scrolling past the
 * whole list. Add and edit render the same field set (CatalogueFields), so a
 * new record is described exactly as completely as an existing one.
 */
export const dynamic = 'force-dynamic';

export default async function PackagesAdminPage({
  searchParams,
}: {
  // `?open=` is set by the save actions so the row you just edited comes back
  // expanded instead of the whole list collapsing under you.
  searchParams: Promise<{ open?: string }>;
}) {
  const [{ open }, catalogue, media] = await Promise.all([
    searchParams,
    listCatalogueForAdmin(),
    listMedia(),
  ]);

  const assets = media.map((m) => ({
    id: m.id,
    url: m.url,
    name: m.name,
    alt: m.alt,
    folder: m.folder,
  }));

  return (
    <section className="shell">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="Packages & Pricing"
        lede="These are the live numbers. A saved price applies to the very next order — no redeploy, no waiting."
      />

      {catalogue.packages.length === 0 ? (
        <p className="mt-8 rounded-[2px] border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-gold-soft">
          The price list has not been seeded yet, so the site is still rendering the
          defaults from the code. Run <code>npm run db:seed</code> once to import them,
          then edit them here.
        </p>
      ) : null}

      {/* ══ Packages ═══════════════════════════════════════════════════════ */}
      <h2 className="mt-12 font-serif text-[24px] text-ivory">Packages</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        Shown on the homepage, the packages page and as the first step of the order
        form. Switching one off hides it everywhere without touching orders already
        placed under it.
      </p>

      <div className="mt-6 space-y-3">
        <form key={catalogue.packages.length} action={createPackage}>
          <Disclosure title="Add a package" meta="New package" open={open === 'new-package'}>
            <PackageFields assets={assets} />
            <Actions>
              <Save label="Add package" />
            </Actions>
          </Disclosure>
        </form>

        {catalogue.packages.map((pkg) => (
          <form key={pkg.id} action={updatePackage}>
            <input type="hidden" name="id" value={pkg.id} />
            <Disclosure
              id={`pkg-${pkg.id}`}
              open={open === `pkg-${pkg.id}`}
              title={pkg.name}
              meta={`${formatMoney(pkg.price)} · ${pkg.sizeShort}${pkg.featured ? ' · most popular' : ''}${pkg.active ? '' : ' · hidden'}`}
              muted={!pkg.active}
            >
              <PackageFields pkg={pkg} assets={assets} />

              <Actions>
                <Save />
                <Danger
                  action={deletePackage}
                  label="Delete package"
                  confirm={`Delete "${pkg.name}"? Orders already placed keep their own copy of the name and price, so history stays intact.`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}
      </div>

      {/* ══ Extras ═════════════════════════════════════════════════════════ */}
      <h2 className="mt-16 font-serif text-[24px] text-ivory">Extras</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        Ticked by the customer at checkout. Choosing the colour medium adds the matching
        extra automatically, so a customer is never charged twice.
      </p>

      <div className="mt-6 space-y-3">
        <form action={saveAddOn}>
          <Disclosure
            title="Add an extra"
            meta="New checkout option"
            open={open === 'new-addon'}
          >
            <AddOnFields />
            <Actions>
              <Save label="Add extra" />
            </Actions>
          </Disclosure>
        </form>

        {catalogue.addOns.map((addOn) => (
          <form key={addOn.id} action={saveAddOn}>
            <input type="hidden" name="id" value={addOn.id} />
            <Disclosure
              id={`addon-${addOn.id}`}
              open={open === `addon-${addOn.id}`}
              title={addOn.name}
              meta={`+${formatMoney(addOn.price)}${addOn.active ? '' : ' · hidden'}`}
              muted={!addOn.active}
            >
              <AddOnFields addOn={addOn} />

              <Actions>
                <Save />
                <Danger
                  action={deleteAddOn}
                  label="Delete"
                  confirm={`Delete the "${addOn.name}" extra?`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}
      </div>

      {/* ══ Mediums ════════════════════════════════════════════════════════ */}
      <h2 className="mt-16 font-serif text-[24px] text-ivory">Mediums</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        The material the portrait is drawn in, chosen on the first step of the order
        form and listed on the packages page.
      </p>

      <div className="mt-6 space-y-3">
        <form action={saveStyle}>
          <Disclosure title="Add a medium" meta="New material" open={open === 'new-style'}>
            <StyleFields />
            <Actions>
              <Save label="Add medium" />
            </Actions>
          </Disclosure>
        </form>

        {catalogue.styles.map((style) => (
          <form key={style.id} action={saveStyle}>
            <input type="hidden" name="id" value={style.id} />
            <Disclosure
              id={`style-${style.id}`}
              open={open === `style-${style.id}`}
              title={style.name}
              meta={`${style.id}${style.active ? '' : ' · hidden'}`}
              muted={!style.active}
            >
              <StyleFields style={style} />

              <Actions>
                <Save />
                <Danger
                  action={deleteStyle}
                  label="Delete"
                  confirm={`Delete "${style.name}"?`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}
      </div>

      {/* ══ Delivery ═══════════════════════════════════════════════════════ */}
      <h2 className="mt-16 font-serif text-[24px] text-ivory">Delivery</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        Also listed on the shipping page. Options marked as needing an address make the
        postal fields required on the order form.
      </p>

      <div className="mt-6 space-y-3">
        <form action={saveDelivery}>
          <Disclosure
            title="Add a delivery option"
            meta="New way to receive the artwork"
            open={open === 'new-delivery'}
          >
            <DeliveryFields />
            <Actions>
              <Save label="Add option" />
            </Actions>
          </Disclosure>
        </form>

        {catalogue.deliveryOptions.map((option) => (
          <form key={option.id} action={saveDelivery}>
            <input type="hidden" name="id" value={option.id} />
            <Disclosure
              id={`delivery-${option.id}`}
              open={open === `delivery-${option.id}`}
              title={option.name}
              meta={`${option.price === 0 ? 'Included' : `+${formatMoney(option.price)}`}${option.requiresAddress ? ' · needs address' : ''}${option.active ? '' : ' · hidden'}`}
              muted={!option.active}
            >
              <DeliveryFields option={option} />

              <Actions>
                <Save />
                <Danger
                  action={deleteDelivery}
                  label="Delete"
                  confirm={`Delete the "${option.name}" delivery option?`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}
      </div>

      <p className="mt-14 text-[12px] text-grey">
        Changes appear on{' '}
        <Link
          href="/packages"
          target="_blank"
          className="text-gold-soft underline-offset-4 hover:underline"
        >
          the packages page
        </Link>{' '}
        immediately after saving.
      </p>
    </section>
  );
}
