/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  SKELETONS                                                               ║
 * ║                                                                          ║
 * ║  Every page reads from the database, so every navigation has a gap to    ║
 * ║  fill. A spinner says "wait"; a skeleton says "here is the page, the     ║
 * ║  words are on their way" — the layout does not jump when the real        ║
 * ║  content lands, because the placeholder was already its shape.           ║
 * ║                                                                          ║
 * ║  These are the pieces. Each route composes them in its own loading.tsx   ║
 * ║  so the placeholder matches that page rather than being generic.         ║
 * ║                                                                          ║
 * ║  The shimmer itself is `.skeleton` in globals.css.                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * A hairline of movement along the bottom of a button.
 *
 * Used where the wait has no shape to skeleton — a form posting, a redirect to
 * the payment provider — so the button itself can show that something is
 * happening rather than just going grey.
 */
export function ProgressLine({ className = 'bg-black/50' }: { className?: string }) {
  return (
    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
      <span className={`block h-full w-1/3 animate-shimmer ${className}`} />
    </span>
  );
}

/** One shimmering line of text. */
export function Line({ className = 'h-3 w-full' }: { className?: string }) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

/** A shimmering block — an image, a button, a panel. */
export function Block({ className = 'h-24 w-full' }: { className?: string }) {
  return <div className={`skeleton rounded-[2px] ${className}`} />;
}

/** Stand-in for <SectionHead>: eyebrow, title, lede. */
export function HeadSkeleton({
  align = 'center',
  lede = true,
}: {
  align?: 'center' | 'left';
  lede?: boolean;
}) {
  const centred = align === 'center';

  return (
    <div className={`space-y-4 ${centred ? 'mx-auto max-w-xl text-center' : 'max-w-xl'}`}>
      <div className={centred ? 'flex justify-center' : ''}>
        <Line className="h-2.5 w-24" />
      </div>
      <div className={`space-y-2.5 ${centred ? 'flex flex-col items-center' : ''}`}>
        <Line className="h-8 w-4/5 sm:h-9" />
        <Line className="h-8 w-3/5 sm:h-9" />
      </div>
      {lede ? (
        <div className={`space-y-2 ${centred ? 'flex flex-col items-center' : ''}`}>
          <Line className="h-3 w-full max-w-md" />
          <Line className="h-3 w-2/3 max-w-sm" />
        </div>
      ) : null}
    </div>
  );
}

/** A run of body copy. */
export function ProseSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Line key={i} className={i === lines - 1 ? 'h-3 w-1/2' : 'h-3 w-full'} />
      ))}
    </div>
  );
}

/**
 * Stand-in for a row of package cards.
 *
 * The column classes are spelled out rather than borrowed from `gridColumns`
 * because the real count is not known until the data arrives — three across is
 * the middle guess, and it settles without a jump for any realistic number.
 */
export function CardsSkeleton({ count = 3, detailed = false }: { count?: number; detailed?: boolean }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-4">
          <Block className="aspect-[4/5] w-full max-w-[260px]" />
          <Line className="h-2.5 w-16" />
          <Line className="h-5 w-32" />
          <Line className="h-6 w-20" />

          {detailed ? (
            <div className="mt-2 w-full space-y-2.5">
              <Line className="h-3 w-full" />
              <Line className="h-3 w-4/5" />
              <div className="space-y-2 pt-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Line key={j} className="h-2.5 w-full" />
                ))}
              </div>
              <Block className="mt-5 h-10 w-full" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Stand-in for a grid of artwork. */
export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2.5">
          <Block className="aspect-[4/5] w-full" />
          <Line className="h-3 w-2/3" />
          <Line className="h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Stand-in for a list of bordered panels — FAQ rows, delivery options. */
export function PanelsSkeleton({
  count = 4,
  className = 'space-y-3',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel space-y-3 p-5 sm:p-6">
          <Line className="h-4 w-2/3" />
          <Line className="h-3 w-full" />
          <Line className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
