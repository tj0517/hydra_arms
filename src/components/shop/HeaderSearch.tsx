'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Shop search in the site header (HA-2.32). Mounted by Nav only on /sklep*.
 * Submitting navigates to /sklep?q=<phrase> — the same parameter the listing
 * reads (HA-2.30); the phrase goes into the URL only, via URLSearchParams.
 * Desktop: an inline field. Mobile: a magnifier that expands a field under the bar.
 * On /sklep itself the submit is a full page load (decision tj 2026-10-20, A2): the
 * listing reads ?q= only when it mounts, and keying it by q made the toolbar search
 * remount the grid on every keystroke — so no listing files are touched.
 * Both forms carry action="/sklep" method="get": a submit before hydration (or
 * without JS) still lands on /sklep?q=<phrase> with the same encoding.
 */
export default function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mobileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) mobileInput.current?.focus();
  }, [open]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const phrase = (new FormData(e.currentTarget).get('q') as string | null)?.trim() ?? '';
    if (!phrase) return;
    const params = new URLSearchParams({ q: phrase });
    const url = `/sklep?${params.toString()}`;
    setOpen(false);
    if (pathname === '/sklep') window.location.assign(url);
    else router.push(url);
  }

  const input =
    'w-full bg-transparent border-b border-white/15 focus:border-accent/60 outline-none font-[var(--font-mono)] text-xs tracking-[0.15em] uppercase text-white placeholder:text-text-dim/60 py-1.5 transition-colors duration-300';

  return (
    <>
      {/* Desktop field */}
      <form role="search" action="/sklep" method="get" onSubmit={submit} className="hidden lg:block w-[200px] xl:w-[240px] ml-auto mr-9" data-testid="header-search">
        <label htmlFor="header-search-q" className="sr-only">Szukaj w sklepie</label>
        <input id="header-search-q" name="q" type="search" autoComplete="off" placeholder="Szukaj w sklepie" className={input} />
      </form>

      {/* Mobile toggle — sits beside the burger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="lg:hidden z-[101] ml-auto mr-5 text-accent hover:text-white transition-colors duration-300"
        aria-label={open ? 'Zamknij wyszukiwarkę' : 'Szukaj'}
        aria-expanded={open}
        aria-controls="header-search-mobile"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile field — full-width row under the bar */}
      <form
        id="header-search-mobile"
        role="search"
        action="/sklep"
        method="get"
        onSubmit={submit}
        className={`lg:hidden absolute left-0 right-0 top-full px-[clamp(32px,5vw,64px)] pb-4 bg-bg/95 backdrop-blur-sm border-b border-white/[0.06] transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        data-testid="header-search-mobile"
      >
        <label htmlFor="header-search-q-mobile" className="sr-only">Szukaj w sklepie</label>
        <input ref={mobileInput} id="header-search-q-mobile" name="q" type="search" autoComplete="off" placeholder="Szukaj w sklepie" className={input} tabIndex={open ? 0 : -1} />
      </form>
    </>
  );
}
