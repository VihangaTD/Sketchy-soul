import { HeadSkeleton, PanelsSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="pb-20">
        <div className="shell mx-auto max-w-3xl">
          <PanelsSkeleton count={7} />
        </div>
      </section>
    </>
  );
}
