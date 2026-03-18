"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
  { href: "/sklep", label: "Sklep" },
  { href: "/wspolpraca", label: "Współpraca" },
  { href: "/kontakt", label: "Kontakt" },
];

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
          ? "bg-[rgba(5,5,5,0.9)] backdrop-blur-[20px] py-4 border-b border-accent/10"
          : "py-6"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-[clamp(24px,4vw,80px)] flex justify-between items-center">
        <Link
          href="/"
          className="font-[var(--font-mono)] text-xl font-bold text-white tracking-[0.15em] z-[101]"
        >
          HYDRA<span className="text-accent">.</span>ARMS
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-9 list-none items-center">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] transition-colors duration-300 relative group ${
                  pathname === link.href ? "text-accent" : "text-text-dim hover:text-white"
                }`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/kontakt"
              className="font-[var(--font-mono)] text-[11px] px-6 py-2.5 border border-accent text-accent uppercase tracking-[0.15em] transition-all duration-300 hover:bg-accent hover:text-bg"
            >
              Kontakt
            </Link>
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

        {/* Mobile menu */}
        <div
          className={`fixed inset-0 bg-bg z-[100] flex flex-col items-center justify-center gap-8 transition-all duration-500 md:hidden ${
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
                pathname === link.href ? "text-accent" : "text-text-dim"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
