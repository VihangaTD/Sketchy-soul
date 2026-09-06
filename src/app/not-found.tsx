import Link from 'next/link';
import { SketchPortrait } from '@/components/SketchPortrait';
import { SectionHead } from '@/components/SectionHead';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

/**
 * Unmatched URLs are caught here, above the (site) group, so this page carries
 * its own header and footer — a visitor who mistypes a URL still gets a way
 * back into the site rather than a dead end.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        <section className="section bg-gold-wash">
          <div className="shell mx-auto max-w-lg text-center">
            <SketchPortrait variant={2} className="mx-auto mb-6 h-28 w-28 opacity-70" />

            <SectionHead as="h1" eyebrow="404" title="This page was never drawn." />

            <p className="lede mx-auto mt-4 max-w-[38ch]">
              The link may be old, or the page may have moved. The gallery and the
              packages are both a click away.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/" className="btn-primary w-full sm:w-auto">
                Back to the Studio
              </Link>
              <Link href="/gallery" className="btn-ghost w-full sm:w-auto">
                View the Gallery
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
