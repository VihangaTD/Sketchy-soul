import { CardsSkeleton, HeadSkeleton, PanelsSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="shell">
          <CardsSkeleton count={3} detailed />
        </div>
      </section>

      <section className="section hairline-t bg-charcoal">
        <div className="shell">
          <HeadSkeleton lede={false} />
          <div className="mt-10">
            <PanelsSkeleton count={3} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" />
          </div>
        </div>
      </section>
    </>
  );
}
