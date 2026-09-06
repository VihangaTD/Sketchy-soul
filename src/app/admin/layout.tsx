import type { Metadata } from 'next';

import { AdminHeader } from '@/components/admin/AdminHeader';

/**
 * Shell for every /admin screen.
 *
 * The login page renders inside this too, so the toolbar hides itself there —
 * see AdminHeader.
 */
export const metadata: Metadata = {
  title: 'Studio Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* The toolbar is sticky, so without a way past it the keyboard has to
          tab through six section links on every screen to reach the form. */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-2 focus:text-[#141414]"
      >
        Skip to content
      </a>

      <AdminHeader />

      <main id="admin-main" className="pb-24 pt-10">
        {children}
      </main>
    </div>
  );
}
