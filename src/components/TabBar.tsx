'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tabLinks } from '@/lib/site';

/**
 * The four-item bottom bar from the UI concept. Phones only — hidden from `md`
 * up, where the header navigation takes over. Sits above the iOS home
 * indicator via the safe-area inset.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-charcoal/95 backdrop-blur-md md:hidden"
    >
      <ul className="safe-b flex items-center justify-around px-2.5 pb-[10px] pt-3.5">
        {tabLinks.map((tab) => {
          const active = tab.match.test(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-w-[64px] flex-col items-center gap-[5px] py-1"
              >
                <span
                  aria-hidden="true"
                  className={`h-[5px] w-[5px] rounded-full transition-colors ${
                    active ? 'bg-gold' : 'bg-transparent'
                  }`}
                />
                <span
                  className={`text-[9.5px] uppercase tracking-[1px] transition-colors ${
                    active ? 'text-ivory' : 'text-grey'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
