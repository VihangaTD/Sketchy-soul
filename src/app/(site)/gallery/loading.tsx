import { GallerySkeleton, HeadSkeleton, Line } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-8">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="shell">
          {/* The filter rail sits above the grid on the real page. */}
          <div className="mb-8 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Line key={i} className="h-8 w-24" />
            ))}
          </div>

          <GallerySkeleton count={9} />
        </div>
      </section>
    </>
  );
}
