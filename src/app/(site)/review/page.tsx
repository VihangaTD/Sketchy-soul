import { SectionHead } from '@/components/SectionHead';
import { ReviewForm } from '@/components/ReviewForm';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Add a Review', description: 'Share your Sketchy Soul portrait experience.', path: '/review', noIndex: true });

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <section className="section">
      <div className="shell mx-auto max-w-2xl">
        <SectionHead as="h1" align="left" eyebrow="Your experience" title="A few words mean a lot." lede="Tell us about your portrait. You’ll need the reference number from your paid order to submit a review." />
        <ReviewForm initialReference={typeof ref === 'string' ? ref.slice(0, 30) : ''} />
      </div>
    </section>
  );
}
