'use client';

import { useSiteDetails } from '@/components/ContactDetailsProvider';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { navLinks } from '@/lib/site';

/**
 * Sticky header. On phones it is the mark + the three-line burger from the
 * concept; from `md` up the links expand inline.
 *
 * There is deliberately no CTA button up here. The way into the studio is to
 * pick a package first, so the "Packages" link is the route in and the order
 * form is reached from there — one journey, not two competing ones.
 */
export function SiteHeader() {
  const site = useSiteDetails();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /**
   * Keyboard handling for the drawer.
   *
   * Escape closed it already. Tab did not: focus walked straight out of the
   * open drawer and into the page underneath — which is covered, so a keyboard
   * or screen-reader user was tabbing through links they could not see and
   * could not get back from. Tab now cycles inside the drawer, and closing it
   * returns focus to the burger that opened it.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key !== 'Tab' || !open) return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends. Focus sitting outside the drawer entirely (the
      // burger, say) is pulled back to the first link.
      if (e.shiftKey && (active === first || !drawerRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Move focus into the drawer when it opens, and back to the burger when it
  // closes, so the keyboard never loses its place.
  useEffect(() => {
    if (open) {
      drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    } else if (document.activeElement && drawerRef.current?.contains(document.activeElement)) {
      burgerRef.current?.focus();
    }
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-2 focus:text-[#141414]"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled || open
            ? 'border-b border-hairline bg-[rgba(10,10,11,0.88)] backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="shell flex items-center justify-between py-[18px] sm:py-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-[20px] tracking-[2px] text-ivory sm:text-[22px]"
            aria-label={`${site.name} — home`}
          >
            {site.markPrefix}
            <span className="text-gold">{site.markSuffix}</span>
          </Link>

          {/* Desktop navigation. Without the old CTA to anchor the right edge
              the links carry it themselves, so they get a touch more air. */}
          <nav className="hidden items-center gap-7 md:flex lg:gap-9" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`relative text-[12px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                  isActive(link.href) ? 'text-ivory' : 'text-grey hover:text-ivory'
                }`}
              >
                {link.label}
                {isActive(link.href) ? (
                  <span className="absolute -bottom-1.5 left-0 h-px w-full bg-gold" />
                ) : null}
              </Link>
            ))}
          </nav>

          {/* Mobile burger — the three hairlines from the concept */}
          <button
            type="button"
            ref={burgerRef}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-end md:hidden"
          >
            <span className="flex w-[22px] flex-col gap-[5px]">
              <span
                className={`block h-px w-full bg-ivory transition-transform duration-300 ${
                  open ? 'translate-y-[6px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-px bg-ivory transition-all duration-300 ${
                  open ? 'w-full opacity-0' : 'w-[70%]'
                }`}
              />
              <span
                className={`block h-px w-full bg-ivory transition-transform duration-300 ${
                  open ? '-translate-y-[6px] -rotate-45' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────────────
          Solid, not translucent. It was `bg-black/97`, and 97 is not on
          Tailwind's opacity scale — the class was never generated, so the
          panel had no background at all and the page read straight through it.

          `min-h-full` rather than `h-full`: the links centre themselves when
          they fit, and the panel grows and scrolls when they do not. With
          `h-full justify-center` a tall menu on a short phone centres its
          overflow, which hides the first links off the top of the screen with
          no way to reach them. */}
      <div
        id="mobile-menu"
        ref={drawerRef}
        hidden={!open}
        // It covers the page and takes the interaction, so it is a dialog and
        // has to say so: without this, a screen reader still announces the
        // page behind it as though it were reachable.
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="fixed inset-0 z-30 overflow-y-auto overscroll-contain bg-black md:hidden"
      >
        <nav
          className="shell pb-tabbar flex min-h-full flex-col justify-center gap-1 pt-24"
          aria-label="Mobile"
        >
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-hairline py-4 font-serif text-[28px] text-ivory"
              style={{ animation: `riseIn .5s ease-out ${i * 0.05}s both` }}
            >
              <span className="mr-3 font-sans text-[11px] tracking-[0.2em] text-gold">
                0{i + 1}
              </span>
              {link.label}
            </Link>
          ))}

          {/* Lands on package selection, not the form — same single journey
              the desktop header now implies by having no CTA of its own. */}
          <Link href="/packages" className="btn-primary mt-8">
            Choose a Package
          </Link>

          {/* Clears the fixed tab bar, so the last link is never trapped
              underneath it. */}
          <div className="mt-8 space-y-1 pb-10 text-[12px] text-grey">
            <a href={`mailto:${site.email}`} className="block hover:text-gold-soft">
              {site.email}
            </a>
            {site.social.instagram ? (
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="block hover:text-gold-soft"
              >
                Instagram
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </>
  );
}
