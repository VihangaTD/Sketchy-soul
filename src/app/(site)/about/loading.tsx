import { Block, HeadSkeleton, ProseSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="pb-16">
        <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Block className="aspect-[4/5] w-full" />
          <ProseSkeleton lines={8} />
        </div>
      </section>
    </>
  );
}
