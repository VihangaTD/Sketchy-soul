import Link from 'next/link';
import { ArtFrame } from './ArtFrame';
import { formatMoney, type PortraitPackage } from '@/lib/packages';
import { columnCount, gridColumns } from '@/lib/layout';

/**
 * How wide the artwork may grow inside a card, by how many cards share the row.
 *
 * Four across, a card is about 250px wide and the frame can fill it. Two
 * across it is 536px — and a 4:5 frame that wide is 670px tall, so the artwork
 * swallows the price and the button falls below the fold. Capping the frame
 * keeps it near the size it was designed at however many packages exist, while
 * the card itself still fills its column.
 *
 * Phones stack every layout, so the cap starts at `sm` and leaves the
 * full-bleed mobile card alone.
 */
const FRAME_WIDTH: Record<number, string> = {
  1: 'sm:mx-auto sm:w-full sm:max-w-[260px]',
  2: 'sm:mx-auto sm:w-full sm:max-w-[260px]',
  3: '',
  4: '',
};

/** `sizes` must shrink with the frame or phones fetch a desktop-width JPEG. */
const FRAME_SIZES: Record<number, string> = {
  1: '(max-width: 640px) 90vw, 260px',
  2: '(max-width: 640px) 90vw, 260px',
  3: '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px',
  4: '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 280px',
};

/**
 * Pricing cards. Stacked on phones exactly like the concept; two-up on
 * tablets and up to four-up on desktop.
 */
export function PackageCards({
  packages,
  detailed = false,
}: {
  packages: PortraitPackage[];
  detailed?: boolean;
}) {
  // Column count follows the number of packages, which the artist can change
  // at /admin/packages — three must not leave a gap, five must not strand a
  // card on its own row, and two must not blow the artwork up.
  const columns = columnCount(packages.length);

  return (
    <div className={`grid grid-cols-1 gap-x-8 gap-y-12 sm:gap-y-10 ${gridColumns(packages.length)}`}>
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} detailed={detailed} columns={columns} />
      ))}
    </div>
  );
}

export function PackageCard({
  pkg,
  detailed = false,
  columns = 4,
}: {
  pkg: PortraitPackage;
  detailed?: boolean;
  /** How many cards share a row — decides how large the artwork may be. */
  columns?: number;
}) {
  return (
    <article
      className={`relative flex min-w-0 flex-col break-words text-center ${
        pkg.featured ? 'lg:-mt-4' : ''
      }`}
    >
      {pkg.featured ? (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-gold px-3 py-1 text-[9.5px] uppercase tracking-[0.18em] text-[#141414]">
          Most Popular
        </span>
      ) : null}

      <ArtFrame
        src={pkg.imageUrl ?? undefined}
        alt={pkg.imageAlt ?? `${pkg.name} — ${pkg.size} hand-drawn portrait`}
        sketch={pkg.sketch}
        ratio="aspect-[4/5]"
        sizes={FRAME_SIZES[columns] ?? FRAME_SIZES[4]}
        className={`mb-4 ${detailed ? 'max-sm:mx-auto max-sm:w-full max-sm:max-w-[280px]' : ''} ${FRAME_WIDTH[columns] ?? ''}`}
      />

      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.16em] text-gold">
        {pkg.size}
      </p>
      <h3 className="mb-2 font-serif text-[22px] font-medium text-ivory">{pkg.name}</h3>

      <p className="font-serif text-[24px] text-gold-soft">
        {formatMoney(pkg.price)}{' '}
        <span className="font-sans text-[11px] tracking-[0.5px] text-grey">USD</span>
      </p>

      {detailed ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-grey">{pkg.blurb}</p>

          <ul className="mt-5 space-y-2.5 text-left">
            {pkg.includes.map((item) => (
              <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-grey">
                <span aria-hidden="true" className="mt-[7px] h-px w-2.5 shrink-0 bg-gold" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-grey">
            Turnaround {pkg.turnaround}
          </p>

        </>
      ) : null}

      <Link
        href={`/order?package=${pkg.id}`}
        className={`${!detailed || pkg.featured ? 'btn-primary' : 'btn-ghost'} mt-4 ${detailed ? '' : 'px-3'}`}
      >
        {detailed ? `Choose ${pkg.sizeShort}` : 'Order now'}
      </Link>
    </article>
  );
}
