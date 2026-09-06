'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminNav } from './AdminNav';

/**
 * The admin toolbar.
 *
 * Hidden on the login screen. That screen renders inside the admin layout, so
 * it used to show the whole section nav and a "Sign out" button to somebody
 * who had not signed in — every one of those links is guarded, so clicking any
 * of them bounced straight back to the form they were already looking at.
 */
export function AdminHeader() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;

  return (
    <header className="hairline-b sticky top-0 z-40 bg-black/85 backdrop-blur-sm">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
        <Link href="/admin" className="font-serif text-[17px] tracking-[1.5px] text-ivory">
          Studio<span className="text-gold">Admin</span>
        </Link>

        <AdminNav />

        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] uppercase tracking-[0.14em] text-grey transition-colors hover:text-gold-soft"
          >
            View site ↗
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="btn-ghost btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
