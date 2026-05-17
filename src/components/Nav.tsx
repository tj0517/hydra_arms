"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?";

type NavItem =
  | { href: string; label: string }
  | { label: string; children: { href: string; label: string }[] };

const DROPDOWN_GROUPS: Record<string, { label: string; hrefs: string[] }> = {
  "/o-nas": { label: "O nas", hrefs: ["/o-nas", "/wspolpraca"] },
  "/wspolpraca": { label: "O nas", hrefs: ["/o-nas", "/wspolpraca"] },
  "/aktualnosci": { label: "Aktualności", hrefs: ["/aktualnosci", "/blog"] },
  "/blog": { label: "Aktualności", hrefs: ["/aktualnosci", "/blog"] },
};

function groupLinks(flat: { href: string; label: string }[]): NavItem[] {
  const result: NavItem[] = [];
  const consumed = new Set<string>();

  for (const link of flat) {
    if (consumed.has(link.href)) continue;
    const group = DROPDOWN_GROUPS[link.href];
    if (group) {
      if (consumed.has(group.hrefs[0])) continue;
      const children = group.hrefs
        .map((h) => flat.find((l) => l.href === h))
        .filter(Boolean) as { href: string; label: string }[];
      if (children.length > 1) {
        result.push({ label: group.label, children });
        group.hrefs.forEach((h) => consumed.add(h));
        continue;
      }
    }
    result.push(link);
    consumed.add(link.href);
  }
  return result;
}

const FLAT_LINKS = [
  { href: "/", label: "Start" },
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
  { href: "/aktualnosci", label: "Aktualności" },
  { href: "/blog", label: "Blog" },
  { href: "/sklep", label: "Sklep" },
  { href: "/wspolpraca", label: "Współpraca" },
  { href: "/kontakt", label: "Kontakt" },
];

function useScramble(text: string) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scramble = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let iteration = 0;
    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return char;
            if (i < iteration) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );
      iteration += 1;
      if (iteration >= text.length) {
        clearInterval(intervalRef.current!);
        setDisplay(text);
      }
    }, 75);
  }, [text]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplay(text);
  }, [text]);

  return { display, scramble, reset };
}

function ScrambleNavLink({ href, label, active, disabled }: { href: string; label: string; active: boolean; disabled?: boolean }) {
  const { display, scramble, reset } = useScramble(label);
  return (
    <li>
      {disabled ? (
        <span
          className={`draw-line-hover font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] relative transition-colors duration-300 cursor-default ${
            active ? "text-accent" : "text-text-dim hover:text-white"
          }`}
          onMouseEnter={scramble}
          onMouseLeave={reset}
        >
          {display}
        </span>
      ) : (
        <Link
          href={href}
          className={`draw-line-hover font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] relative transition-colors duration-300 ${
            active ? "text-accent" : "text-text-dim hover:text-white"
          }`}
          onMouseEnter={scramble}
          onMouseLeave={reset}
        >
          {display}
        </Link>
      )}
    </li>
  );
}

function ScrambleDropdown({ label, children, pathname, navRef, scrolled }: { label: string; children: { href: string; label: string }[]; pathname: string; navRef: React.RefObject<HTMLElement | null>; scrolled: boolean }) {
  const { display, scramble, reset } = useScramble(label);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLLIElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rafRef = useRef<number>(0);
  const isActive = children.some((c) => pathname === c.href);

  const updatePos = useCallback(() => {
    if (triggerRef.current && navRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const navBottom = navRef.current.getBoundingClientRect().bottom;
      setPos({ top: navBottom, left: rect.left + rect.width / 2 });
    }
    rafRef.current = requestAnimationFrame(updatePos);
  }, [navRef]);

  const enter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePos();
    setOpen(true);
    scramble();
  };
  const leave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
      cancelAnimationFrame(rafRef.current);
    }, 150);
    reset();
  };

  return (
    <li className="relative" ref={triggerRef} onMouseEnter={enter} onMouseLeave={leave}>
      <span
        className={`draw-line-hover font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] relative transition-colors duration-300 cursor-default ${
          isActive ? "text-accent" : "text-text-dim hover:text-white"
        }`}
      >
        {display}
        <svg
          className={`inline-block ml-1 w-3 h-3 align-middle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </span>
      <div
        className={`fixed -translate-x-1/2 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ top: pos.top, left: pos.left, transition: "opacity 0.2s" }}
      >
        <ul className={`px-3 py-2 flex flex-col min-w-max ${scrolled ? "bg-bg/95 backdrop-blur-sm border border-white/[0.06] border-t-0" : ""}`}>
          {children.map((child) => (
            <ScrambleNavLink key={child.href} href={child.href} label={child.label} active={pathname === child.href} />
          ))}
        </ul>
      </div>
    </li>
  );
}

function ScrambleButton({ href, label, disabled }: { href: string; label: string; disabled?: boolean }) {
  const { display, scramble, reset } = useScramble(label);
  if (disabled) {
    return (
      <span
        className="draw-line-hover font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] transition-colors duration-300 hover:text-white cursor-default"
        onMouseEnter={scramble}
        onMouseLeave={reset}
      >
        <span className="text-text-dim">[</span> <span className="text-accent">{display}</span> <span className="text-text-dim">]</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="draw-line-hover font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] transition-colors duration-300 hover:text-white"
      onMouseEnter={scramble}
      onMouseLeave={reset}
    >
      <span className="text-text-dim">[</span> <span className="text-accent">{display}</span> <span className="text-text-dim">]</span>
    </Link>
  );
}

export default function Nav({ navLinks }: { navLinks?: { href: string; label: string }[] } = {}) {
  const flat = navLinks?.length ? navLinks : FLAT_LINKS;
  const desktopLinks = groupLinks(flat);
  const mobileLinks = flat;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "py-4 bg-bg/95 backdrop-blur-sm border-b border-white/[0.06]"
            : "py-6 bg-gradient-to-b from-bg/70 to-transparent"
        }`}
      >
        <div className="px-[clamp(32px,5vw,64px)] flex justify-between items-center">
          <span className="font-[var(--font-mono)] text-xl font-bold text-white tracking-[0.15em] z-[101]">
            HYDRA<span className="text-accent">.</span>ARMS
          </span>

          {/* Desktop links */}
          <ul className="hidden md:flex gap-9 list-none items-center">
            {desktopLinks.map((item) =>
              "children" in item ? (
                <ScrambleDropdown key={item.label} label={item.label} children={item.children} pathname={pathname} navRef={navRef} scrolled={scrolled} />
              ) : (
                <ScrambleNavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
              )
            )}
            <li>
              <ScrambleButton href="/konto" label={loggedIn ? "Konto" : "Zaloguj"} />
            </li>
          </ul>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 z-[101]"
            aria-label="Menu"
          >
            <span
              className={`w-6 h-px bg-accent transition-all duration-300 ${
                menuOpen ? "rotate-45 translate-y-[3.5px]" : ""
              }`}
            />
            <span
              className={`w-6 h-px bg-accent transition-all duration-300 ${
                menuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu — outside nav to avoid backdrop-blur containing block */}
      <div
        className={`fixed inset-0 bg-bg z-[999] flex flex-col items-center justify-center gap-8 transition-all duration-500 md:hidden ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {mobileLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-[var(--font-mono)] text-2xl uppercase tracking-[0.2em] transition-colors duration-300 ${
                pathname === link.href ? "text-accent" : "text-text-dim hover:text-white"
              }`}
            >
              {link.label}
            </Link>
        ))}
        <Link
          href="/konto"
          className="font-[var(--font-mono)] text-2xl uppercase tracking-[0.2em] text-text-dim hover:text-white transition-colors duration-300"
        >
          {loggedIn ? "Konto" : "Zaloguj"}
        </Link>
      </div>
    </>
  );
}
