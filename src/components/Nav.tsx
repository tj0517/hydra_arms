"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?";

const links = [
  { href: "/", label: "Home" },
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
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

function ScrambleNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const { display, scramble, reset } = useScramble(label);
  return (
    <li>
      <span
        className={`font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] relative ${
          active ? "text-accent" : "text-text-dim"
        } pointer-events-none cursor-default`}
      >
        {label}
      </span>
    </li>
  );
}

function ScrambleButton({ href, label }: { href: string; label: string }) {
  const { display, scramble, reset } = useScramble(label);
  return (
    <Link
      href={href}
      className="font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] transition-colors duration-300 hover:text-white"
      onMouseEnter={scramble}
      onMouseLeave={reset}
    >
      <span className="text-text-dim">[</span> <span className="text-accent underline">{display}</span> <span className="text-text-dim">]</span>
    </Link>
  );
}

export default function Nav() {
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
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        scrolled
          ? "py-4"
          : "py-6"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-[clamp(24px,4vw,80px)] flex justify-between items-center">
        <span className="font-[var(--font-mono)] text-xl font-bold text-white tracking-[0.15em] z-[101]">
          HYDRA<span className="text-accent">.</span>ARMS
        </span>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-9 list-none items-center">
          {links.map((link) => (
            <ScrambleNavLink key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
          ))}
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

        {/* Mobile menu */}
        <div
          className={`fixed inset-0 bg-bg z-[100] flex flex-col items-center justify-center gap-8 transition-all duration-500 md:hidden ${
            menuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {links.map((link) => (
            <span
              key={link.href}
              className={`font-[var(--font-mono)] text-2xl uppercase tracking-[0.2em] ${
                pathname === link.href ? "text-accent" : "text-text-dim"
              }`}
            >
              {link.label}
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}
