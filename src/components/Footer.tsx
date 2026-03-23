"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
  { href: "/sklep", label: "Sklep" },
  { href: "/wspolpraca", label: "Współpraca" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Footer() {
  const pathname = usePathname();
  const disabled = pathname === "/o-nas";
  return (
    <footer className="relative border-t border-white/5 overflow-hidden">
      {/* Rain video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.25] contrast-[1.3]"
      >
        <source src="/rain.mp4" type="video/mp4" />
      </video>

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="moving-grain !opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/40 to-bg/80" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-[clamp(24px,4vw,80px)] py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:justify-between gap-12 md:gap-8">
          {/* Company info */}
          <div className="md:mr-auto">
            <div className="font-[var(--font-mono)] text-xl font-bold text-white tracking-[0.15em] mb-6">
              HYDRA<span className="text-accent">.</span>ARMS
            </div>
            <div className="font-[var(--font-mono)] text-xs text-text-dim leading-relaxed space-y-1">
              <p>HYDRA ARMS SP. Z O.O.</p>
              <p>NIP: [ 000000000 ]</p>
              <p>REGON: [ 00000000 ]</p>
              <p>KONCESJA MSWiA NR: [ B-000/00 ]</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-12 md:gap-16">
          {/* Navigation */}
          <div className="md:text-right">
            <h4 className="font-[var(--font-mono)] text-sm text-white uppercase tracking-[0.2em] mb-6">
              Nawigacja
            </h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <span className="font-[var(--font-mono)] text-xs text-text-dim">
                    {link.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:text-right">
            <h4 className="font-[var(--font-mono)] text-sm text-white uppercase tracking-[0.2em] mb-6">
              Kontakt
            </h4>
            <div className="flex gap-4 mb-6 md:justify-end">
              {/* Social icons */}
              <span
                onClick={disabled ? undefined : () => window.open("#!", "_blank")}
                className={`w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                aria-label="Facebook"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </span>
              <span
                onClick={disabled ? undefined : () => window.open("#!", "_blank")}
                className={`w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                aria-label="Instagram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </span>
              <span
                onClick={disabled ? undefined : () => window.open("#!", "_blank")}
                className={`w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                aria-label="Email"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-[clamp(24px,4vw,80px)] py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim uppercase tracking-[0.15em]">
            [ Polityka prywatności ]
          </span>
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim uppercase tracking-[0.15em]">
            [ Regulamin ]
          </span>
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim uppercase tracking-[0.15em]">
            [ MADE BY ... ]
          </span>
        </div>
      </div>
    </footer>
  );
}
