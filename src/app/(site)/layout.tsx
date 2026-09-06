import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TabBar } from '@/components/TabBar';
import { CookieConsent } from '@/components/CookieConsent';
import { Analytics } from '@/components/Analytics';
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/seo';
import { getCatalogue } from '@/lib/cms/catalogue';

/**
 * Everything the public sees wraps around this layout.
 *
 * (site) is a route group: the folder name is in brackets, so it adds nothing
 * to any URL — /about is still /about. It exists purely so the header, footer,
 * tab bar, cookie banner and analytics stop at the edge of the website and
 * never reach /admin, which has its own toolbar and its own audience of one.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Only needed for the priceRange in the LocalBusiness schema, but reading it
  // here keeps every page's structured data honest after a price edit.
  const catalogue = await getCatalogue();

  return (
    <>
      <JsonLd data={[organizationSchema(catalogue), websiteSchema()]} />

      <div className="pb-tabbar flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>

      <TabBar />
      <CookieConsent />
      <Analytics />
    </>
  );
}
