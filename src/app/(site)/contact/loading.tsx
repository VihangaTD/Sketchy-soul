import { Block, HeadSkeleton, Line } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton />
        </div>
      </section>

      <section className="pb-20">
        <div className="shell mx-auto max-w-2xl space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Line className="h-2.5 w-28" />
              <Block className="h-11 w-full" />
            </div>
          ))}
          <div className="space-y-2">
            <Line className="h-2.5 w-28" />
            <Block className="h-32 w-full" />
          </div>
          <Block className="h-11 w-40" />
        </div>
      </section>
    </>
  );
}
