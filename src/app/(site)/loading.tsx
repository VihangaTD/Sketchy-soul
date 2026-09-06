import { CardsSkeleton, GallerySkeleton, HeadSkeleton, Line } from '@/components/Skeleton';

/**
 * Fallback placeholder for the homepage and any page in the group without one
 * of its own. Shaped like the homepage: hero, then packages, then work.
 */
export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash">
        <div className="shell">
          <HeadSkeleton />
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Line className="h-11 w-full max-w-[220px] rounded-[2px]" />
            <Line className="h-11 w-full max-w-[220px] rounded-[2px]" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <HeadSkeleton lede={false} />
          <div className="mt-10">
            <CardsSkeleton count={3} />
          </div>
        </div>
      </section>

      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <GallerySkeleton count={6} />
        </div>
      </section>
    </>
  );
}
