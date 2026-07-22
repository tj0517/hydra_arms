"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
        preload="none"
        className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.55] contrast-[1.3]"
      >
        {visible && <source src="/video/rain.mp4" type="video/mp4" />}
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

      <div className="relative px-[clamp(32px,5vw,64px)] py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row lg:justify-between gap-8 lg:gap-16">

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
              <p>Koncesja MSWiA: [ {koncesja} ]</p>
              <p>NCAGE: [ {ncage} ]</p>
              <p>D-U-N-S®: [ {duns} ]</p>
              <p>UEI: [ {uei} ]</p>
            </div>
          </div>

          {/* ── Col 2: Cert Badges ── */}
          <div className={`order-2 md:order-none flex flex-col gap-4 transition-all duration-700 delay-100 lg:-translate-x-[5%] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-[var(--font-mono)] text-base text-white uppercase tracking-[0.2em]">
              Certyfikaty
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: CCJ logo */}
              <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-center h-[100px]">
                <Image src="/cert/Curve.png" alt="CCJ — Centrum Certyfikacji Jakości" width={1000} height={1200} sizes="120px" loading="lazy" className="max-h-[72px] w-auto object-contain" draggable={false} />
              </div>
              {/* Card 2: NCAGE */}
              <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-center h-[100px]">
                <Image src="/cert/ncage_9CJ3H.png" alt="NCAGE 9CJ3H" width={2384} height={2784} sizes="120px" loading="lazy" className="max-h-[64px] w-auto object-contain" draggable={false} />
              </div>
              {/* Card 3: CCJ + PCA combined — spans both columns */}
              <div className="col-span-2 bg-white/10 rounded-2xl p-4 flex flex-col items-center gap-2">
                <Image src="/cert/PCA CJJ.png" alt="CCJ PN-EN ISO 9001:2015 · PCA AC 057" width={1800} height={800} sizes="(max-width: 640px) 90vw, 280px" loading="lazy" className="max-h-[80px] w-auto object-contain" draggable={false} />
                <div className="text-center text-[8px] text-white/70 leading-snug" style={{ fontFamily: "Arial, sans-serif" }}>
                  <p>AQAP 2110:2016</p>
                  <p>PN-EN ISO 9001:2015</p>
                  <p>Wewnętrzny System Kontroli</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Col 3 + 4 wrapper: 2-col grid on mobile, transparent on md+ ── */}
          <div className="order-3 grid grid-cols-2 gap-8 md:contents">

            {/* ── Col 3: Navigation ── */}
            <div className={`md:col-start-1 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="font-[var(--font-mono)] text-base text-white uppercase tracking-[0.2em] mb-6">
                Nawigacja
              </p>
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

            {/* ── Col 4: Social links ── */}
            <div className={`md:col-start-2 transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="font-[var(--font-mono)] text-base text-white uppercase tracking-[0.2em] mb-6">
                Social
              </p>
              <div className="flex gap-3">
                <a
                  href={`mailto:${emailBiuro}`}
                  aria-label="Email"
                  className="relative w-10 h-10 flex items-center justify-center text-accent hover:bg-accent hover:text-bg transition-colors duration-300 group"
                >
                  <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-text/50 group-hover:border-bg/50 transition-colors duration-300" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-text/50 group-hover:border-bg/50 transition-colors duration-300" />
                  <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-text/50 group-hover:border-bg/50 transition-colors duration-300" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-text/50 group-hover:border-bg/50 transition-colors duration-300" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/5">
        <div className="px-[clamp(32px,5vw,64px)] py-5 flex flex-col items-center gap-3">
          {/* Legal links — wrap naturally */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
              { href: "/polityka-cookies",     label: "Polityka cookies" },
              { href: "/regulamin",            label: "Regulamin sklepu" },
              { href: "/regulamin-uslug",      label: "Regulamin usług" },
              { href: "/polityka-jakosci",     label: "Polityka jakości" },
              { href: "/polityka-wsk",         label: "Polityka WSK" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="font-[var(--font-mono)] text-xs text-text-dim hover:text-accent transition-colors duration-300 uppercase tracking-[0.15em]">
                [ {label} ]
              </Link>
            ))}
          </div>
          {/* Copyright / realizacja */}
          <span className="font-[var(--font-mono)] text-xs text-text-dim/50 uppercase tracking-[0.15em]">
            [ REALIZACJA ... ]
          </span>
        </div>
      </div>
    </footer>
  );
}
