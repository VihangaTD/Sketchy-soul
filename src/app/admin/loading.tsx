import { Block, Line } from '@/components/Skeleton';

/**
 * Shared by every admin screen. They all read from the database on each
 * request (nothing is cached, so an edit is visible the moment it is saved),
 * which makes the gap between clicking a tab and seeing the form real enough
 * to deserve a placeholder rather than a blank page.
 */
export default function Loading() {
  return (
    <section className="shell">
      <div className="space-y-4">
        <Line className="h-2.5 w-24" />
        <Line className="h-9 w-64" />
        <Line className="h-3 w-full max-w-lg" />
      </div>

      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-16 w-full" />
        ))}
      </div>
    </section>
  );
}
