'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin section tabs. Client-side only so the current section can be
 * highlighted without re-rendering the whole shell on navigation.
 */
const SECTIONS = [
  { href: '/admin', label: 'Orders', exact: true },
  { href: '/admin/packages', label: 'Packages' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/pages', label: 'Page Copy' },
  { href: '/admin/content', label: 'Words' },
  { href: '/admin/media', label: 'Photos' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="rail rail-bleed order-3 w-full gap-1 sm:order-none sm:w-auto">
      {SECTIONS.map((section) => {
        const active = section.exact
          ? pathname === section.href
          : pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors duration-200 ${
              active
                ? 'border-gold bg-gold/10 text-gold-soft'
                : 'border-transparent text-grey hover:border-hairline hover:text-ivory'
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
