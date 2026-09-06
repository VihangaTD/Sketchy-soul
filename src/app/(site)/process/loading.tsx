import { Block, HeadSkeleton, Line, ProseSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="section">
        <div className="shell space-y-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <Block className="aspect-[4/5] w-full" />
              <div className="space-y-4">
                <Line className="h-2.5 w-20" />
                <Line className="h-7 w-3/4" />
                <ProseSkeleton lines={4} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
