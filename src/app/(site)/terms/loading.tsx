import { HeadSkeleton, ProseSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="section bg-gold-wash pb-10">
        <div className="shell">
          <HeadSkeleton align="left" />
        </div>
      </section>

      <section className="pb-20">
        <div className="shell max-w-prose space-y-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProseSkeleton key={i} lines={5} />
          ))}
        </div>
      </section>
    </>
  );
}
