import { Block, HeadSkeleton, Line } from '@/components/Skeleton';

/**
 * The wizard needs the live catalogue before it can price anything, so this
 * placeholder holds the step rail and the first panel until it arrives.
 */
export default function Loading() {
  return (
    <section className="section">
      <div className="shell">
        <HeadSkeleton lede={false} />

        <div className="mx-auto mt-10 flex max-w-2xl items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Line key={i} className="h-1.5 flex-1" />
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Block key={i} className="h-28 w-full" />
            ))}
          </div>

          <div className="panel space-y-4 p-5 sm:p-6">
            <Line className="h-2.5 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Line key={i} className="h-3 w-full" />
            ))}
            <Line className="h-6 w-32" />
          </div>
        </div>
      </div>
    </section>
  );
}
