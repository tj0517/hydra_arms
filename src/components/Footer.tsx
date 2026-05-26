"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_NAV_LINKS = [
  { href: "/uslugi", label: "Usługi" },
  { href: "/o-nas", label: "O nas" },
  { href: "/wspolpraca", label: "Współpraca" },
  { href: "/aktualnosci", label: "Aktualności" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/sklep", label: "Sklep" },
];

type SiteSettings = {
  companyName?: string;
  nip?: string;
  regon?: string;
  koncesja?: string;
  krs?: string;
  ncage?: string;
  duns?: string;
  bdo?: string;
  uei?: string;
  adresSiedziby?: string;
  adresSklep?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  emailBiuro?: string;
  emailRd?: string;
  emailB2g?: string;
  emailHandel?: string;
} | null;

export default function Footer({
  navLinks,
  siteSettings,
}: {
  navLinks?: { href: string; label: string }[];
  siteSettings?: SiteSettings;
} = {}) {
  const links = DEFAULT_NAV_LINKS;
  const company = siteSettings?.companyName ?? "HYDRA ARMS SP. Z O.O.";
  const nip = siteSettings?.nip ?? "6793302181";
  const regon = siteSettings?.regon ?? "528976880";
  const koncesja = siteSettings?.koncesja ?? "B-117/2025";
  const krs = siteSettings?.krs ?? "0001111593";
  const ncage = siteSettings?.ncage ?? "9CJ3H";
  const duns = siteSettings?.duns ?? "665007622";
  const bdo = siteSettings?.bdo ?? "000654184";
  const uei = siteSettings?.uei ?? "YUXMMDP8MNP4";
  const adresSiedziby = siteSettings?.adresSiedziby ?? "ul. Cechowa 44B\n30-614 Kraków";
  const adresSklep = siteSettings?.adresSklep ?? "ul. Gdańska 22\n31-411 Kraków";
  const fbUrl = siteSettings?.facebookUrl ?? "#!";
  const igUrl = siteSettings?.instagramUrl ?? "#!";
  const liUrl = siteSettings?.linkedinUrl ?? "#!";
  const emailBiuro = siteSettings?.emailBiuro ?? "office@hydra-arms.com";
  const emailRd = siteSettings?.emailRd ?? "research@hydra-arms.com";
  const emailB2g = siteSettings?.emailB2g ?? "gov@hydra-arms.com";
  const emailHandel = siteSettings?.emailHandel ?? "sprzedaz@hydra-arms.com";
  const footerRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className="relative border-t border-white/5 overflow-hidden">
      {/* Rain video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.55] contrast-[1.3]"
      >
        <source src="/video/rain.mp4" type="video/mp4" />
      </video>

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="moving-grain !opacity-[0.06]" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--color-bg) 0%, transparent 40%, transparent 70%, var(--color-bg) 100%)" }} />
      </div>

      {/* Animated scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-accent/10 pointer-events-none z-[2]"
        style={{
          animation: visible ? "footerScan 6s linear infinite" : "none",
          top: 0,
        }}
      />

      <div className="relative px-[clamp(32px,5vw,64px)] py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:justify-between gap-12 md:gap-16">

          {/* ── Col 1: Company ── */}
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="font-[var(--font-mono)] text-3xl font-bold text-white tracking-[0.15em] mb-6">
              HYDRA<span className="text-accent footer-dot-pulse">.</span>ARMS
            </div>
            <div className="font-[var(--font-mono)] text-xs text-text-dim leading-relaxed space-y-1">
              <p className="text-white font-semibold text-sm">{company}</p>
              <p className="whitespace-pre-line mt-2">{adresSiedziby}</p>
              <p className="text-text-dim/60 mt-1">Sklep: {adresSklep.split("\n").join(", ")}</p>
              <div className="border-t border-white/5 my-3" />
              <p>NIP: [ {nip} ]</p>
              <p>REGON: [ {regon} ]</p>
              <p>KRS: [ {krs} ]</p>
              <p>BDO: [ {bdo} ]</p>
            </div>
          </div>

          {/* ── Cols 2-4 grouped right ── */}
          <div className="flex flex-col sm:flex-row gap-12 md:gap-16">

          {/* ── Col 2: Certifications ── */}
          <div className={`transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <h4 className="font-[var(--font-mono)] text-base text-white uppercase tracking-[0.2em] mb-6">
              Certyfikaty
            </h4>
            <ul className="space-y-3">
              {[
                { code: "ISO", label: "ISO 9001:2015" },
                { code: "AQAP", label: "AQAP 2110:2016" },
                { code: "WSK", label: "Wewnętrzny System Kontroli" },
              ].map((cert) => (
                <li key={cert.code} className="flex items-center gap-3">
                  <span className="font-[var(--font-mono)] text-[10px] text-accent tracking-[0.25em] border border-accent/25 px-2 py-0.5 shrink-0">
                    {cert.code}
                  </span>
                  <span className="font-[var(--font-mono)] text-[11px] text-text-dim tracking-[0.08em]">
                    {cert.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Col 3: Navigation ── */}
          <div className={`transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <h4 className="font-[var(--font-mono)] text-base text-white uppercase tracking-[0.2em] mb-6">
              Nawigacja
            </h4>
            <ul className="space-y-1.5">
              {links.map((link, i) => (
                <li
                  key={link.href}
                  className="transition-all duration-500"
                  style={{
                    transitionDelay: visible ? `${250 + i * 50}ms` : "0ms",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateX(0)" : "translateX(8px)",
                  }}
                >
                  <Link href={link.href} className="font-[var(--font-mono)] text-sm text-text-dim hover:text-accent transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Col 4: Social icons only ── */}
          <div className={`transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="flex flex-wrap gap-3">
              <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 border border-accent/30 flex items-center justify-center text-accent hover:border-accent hover:bg-accent/10 transition-all duration-300"
                aria-label="Facebook"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href={igUrl} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 border border-accent/30 flex items-center justify-center text-accent hover:border-accent hover:bg-accent/10 transition-all duration-300"
                aria-label="Instagram"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href={liUrl} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 border border-accent/30 flex items-center justify-center text-accent hover:border-accent hover:bg-accent/10 transition-all duration-300"
                aria-label="LinkedIn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href={`mailto:${emailBiuro}`}
                className="w-10 h-10 border border-accent/30 flex items-center justify-center text-accent hover:border-accent hover:bg-accent/10 transition-all duration-300"
                aria-label="Email"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>

          </div>{/* end cols 2-4 */}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/5">
        <div className="px-[clamp(32px,5vw,64px)] py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/polityka-prywatnosci" className="font-[var(--font-mono)] text-xs text-text-dim hover:text-accent transition-colors duration-300 uppercase tracking-[0.15em]">
            [ Polityka prywatności ]
          </Link>
          <Link href="/regulamin" className="font-[var(--font-mono)] text-xs text-text-dim hover:text-accent transition-colors duration-300 uppercase tracking-[0.15em]">
            [ Regulamin ]
          </Link>
          <span className="font-[var(--font-mono)] text-xs text-text-dim uppercase tracking-[0.15em]">
            [ REALIZACJA ... ]
          </span>
        </div>
      </div>
    </footer>
  );
}
