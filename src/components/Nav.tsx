"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?";

const FLAT_LINKS = [
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
  { href: "/wspolpraca", label: "Współpraca" },
  { href: "/blog", label: "Blog" },
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

function ScrambleNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const { display, scramble, reset } = useScramble(label);
  return (
    <li>
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
    </li>
  );
}

function ScrambleButton({ href, label }: { href: string; label: string }) {
  const { display, scramble, reset } = useScramble(label);
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
  const links = navLinks?.length ? navLinks : FLAT_LINKS;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "py-4 bg-bg/95 backdrop-blur-sm border-b border-white/[0.06]"
            : "py-6 bg-gradient-to-b from-bg/70 to-transparent"
        }`}
      >
        <div className="px-[clamp(32px,5vw,64px)] flex justify-between items-center">
          <Link
            href="/"
            className="font-[var(--font-mono)] text-xl font-bold text-white tracking-[0.15em] z-[101] hover:opacity-80 transition-opacity duration-300"
          >
            HYDRA<span className="text-accent">.</span>ARMS
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex gap-9 list-none items-center">
            {links.map((item) => (
              <ScrambleNavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
            ))}
            <li>
              <ScrambleButton href="/sklep" label="Sklep" />
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

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 bg-bg z-[999] flex flex-col items-center justify-center gap-8 transition-all duration-500 md:hidden ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {links.map((link) => (
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
          href="/sklep"
          className="font-[var(--font-mono)] text-2xl uppercase tracking-[0.2em] transition-colors duration-300 text-text-dim hover:text-white"
        >
          <span className="text-text-dim">[</span> <span className="text-accent">Sklep</span> <span className="text-text-dim">]</span>
        </Link>
      </div>
    </>
  );
}
