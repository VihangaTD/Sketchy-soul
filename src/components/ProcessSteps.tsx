import type { ProcessStep } from '@/lib/content';

/**
 * The numbered order process. A single vertical thread on phones (as drawn in
 * the concept) and a five-across timeline on large screens.
 *
 * Steps are edited at /admin/content and passed in by the server component
 * that renders this, so the grid is sized from the list rather than fixed.
 */
export function ProcessSteps({
  steps,
  compact = false,
}: {
  steps: ProcessStep[];
  compact?: boolean;
}) {
  return (
    <ol className="mx-auto max-w-3xl lg:max-w-none">
      <div
        className="lg:grid lg:gap-6"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => (
          <li
            key={step.num}
            className={`relative flex gap-[18px] border-b border-hairline py-5 last:border-b-0
                        lg:flex-col lg:gap-4 lg:border-b-0 lg:border-t lg:pt-6`}
          >
            <div className="relative w-[34px] shrink-0 lg:w-auto">
              <span className="font-serif text-[28px] leading-none text-gold">{step.num}</span>
              {/* Connector thread — vertical on mobile, horizontal on desktop. */}
              {i < steps.length - 1 ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-[44px] h-[calc(100%-24px)] w-px bg-gradient-to-b from-gold to-transparent lg:hidden"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -top-[25px] left-0 hidden h-px w-full bg-gradient-to-r from-gold to-transparent lg:block"
                  />
                </>
              ) : null}
            </div>

            <div>
              <h3 className="mb-1.5 font-sans text-[14px] font-medium tracking-[0.4px] text-ivory">
                {step.title}
              </h3>
              {!compact ? (
                <p className="text-[12.5px] leading-relaxed text-grey">{step.body}</p>
              ) : null}
            </div>
          </li>
        ))}
      </div>
    </ol>
  );
}
