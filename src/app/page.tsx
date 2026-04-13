"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import MilitaryMap from "@/components/MilitaryMap";
import MapCrosshair from "@/components/MapCrosshair";
import TypewriterTitle from "@/components/TypewriterTitle";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

/* ──────────── DATA ──────────── */

const services = [
  {
    id: "01",
    label: "Projektowanie i R&D",
    title: "Projektowanie i badania rozwojowe",
    desc: "Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.",
    tags: ["CAD/CAM", "Analizy MES", "Inżynieria odwrotna"],
    img: "/service-01.jpg",
  },
  {
    id: "02",
    label: "Produkcja",
    title: "Produkcja komponentów",
    desc: "Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem precyzyjnych technologii CNC, obróbki cieplnej i kontroli jakości zgodnej ze standardami NATO.",
    tags: ["CNC", "Obróbka cieplna", "Kontrola jakości"],
    img: "/service-02.jpg",
  },
  {
    id: "03",
    label: "Dystrybucja",
    title: "Obrót i dystrybucja",
    desc: "Prowadzimy licencjonowaną działalność handlową w zakresie broni, amunicji oraz wyposażenia specjalnego dla sektora obronnego i odbiorców cywilnych.",
    tags: ["B2G", "B2B", "Rynek cywilny"],
    img: "/service-03.jpg",
  },
  {
    id: "04",
    label: "Serwis",
    title: "Serwis i modernizacja",
    desc: "Zapewniamy kompleksowy serwis techniczny, modernizację istniejących systemów uzbrojenia oraz dostosowanie do aktualnych standardów operacyjnych.",
    tags: ["Modernizacja", "Diagnostyka", "Kalibracja"],
    img: "/service-04.jpg",
  },
];

const filary = [
  {
    tag: "B2G",
    title: "Zamówienia rządowe",
    desc: "Dostawy dla jednostek wojskowych, służb mundurowych i instytucji państwowych realizowane w ramach ścisłych procedur bezpieczeństwa i zamówień publicznych.",
  },
  {
    tag: "B2B",
    title: "Kooperacja przemysłowa",
    desc: "Współpraca z partnerami przemysłowymi w zakresie prototypowania, produkcji seryjnej komponentów i integracji systemów obronnych na zamówienie.",
  },
  {
    tag: "B2C",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych zgodnie z obowiązującymi regulacjami.",
  },
];

/* ──────────── PAGE ──────────── */

export default function HomePage() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const scopeReticleRef = useRef<HTMLDivElement>(null);
  const coordLatRef = useRef<HTMLDivElement>(null);
  const coordLngRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const servicesWrapRef = useRef<HTMLDivElement>(null);
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(
      overlayRef.current,
      { opacity: 1 },
      { opacity: 0, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  /* ── Nightvision scope — circular brightened area follows cursor ── */
  useEffect(() => {
    const hero = heroRef.current;
    const reticle = scopeReticleRef.current;
    if (!hero || !reticle) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;
    const RADIUS = 90;

    const formatCoord = (deg: number, pos: string, neg: string) => {
      const dir = deg >= 0 ? pos : neg;
      const abs = Math.abs(deg);
      const d = Math.floor(abs);
      const m = Math.floor((abs - d) * 60);
      const s = Math.floor(((abs - d) * 60 - m) * 60);
      return `${String(d).padStart(3, "0")}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"${dir}`;
    };

    const updateCoords = (nx: number, ny: number) => {
      const rect = hero.getBoundingClientRect();
      const px = nx / rect.width;
      const py = ny / rect.height;
      // Map to area around Kraków: lat ~50.02–50.10, lng ~19.88–20.02
      const lat = 50.02 + (1 - py) * 0.08;
      const lng = 19.88 + px * 0.14;
      if (coordLatRef.current) coordLatRef.current.textContent = `[ ${formatCoord(lat, "N", "S")} ]`;
      if (coordLngRef.current) coordLngRef.current.textContent = `[ ${formatCoord(lng, "E", "W")} ]`;
    };

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      hero.style.setProperty("--sx", `${curX}px`);
      hero.style.setProperty("--sy", `${curY}px`);
      reticle.style.transform = `translate(${curX - RADIUS}px, ${curY - RADIUS}px)`;
      updateCoords(curX, curY);
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!active) {
        active = true;
        curX = targetX;
        curY = targetY;
        hero.style.setProperty("--sx", `${curX}px`);
        hero.style.setProperty("--sy", `${curY}px`);
        reticle.style.transform = `translate(${curX - RADIUS}px, ${curY - RADIUS}px)`;
        reticle.style.opacity = "1";
        raf = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      hero.style.setProperty("--sx", "-9999px");
      hero.style.setProperty("--sy", "-9999px");
      reticle.style.opacity = "0";
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);


  return (
    <main>
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative h-[100dvh] overflow-hidden bg-bg">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[15] pointer-events-none"
        />

        {/* Clean video background — visible through the cursor hole */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Text cutout mask — black bg + mix-blend-multiply reveals the video through the text glyphs.
            A radial-gradient mask also punches a circular hole at the cursor position, so the clean
            video shows directly around the cursor (in addition to inside the text). */}
        <div
          className="absolute inset-0 z-[3] bg-black mix-blend-multiply flex flex-col justify-center px-8 md:px-16"
          style={{
            maskImage:
              "radial-gradient(circle 90px at var(--sx, -9999px) var(--sy, -9999px), transparent 55%, rgba(0,0,0,0.5) 80%, black 100%)",
            WebkitMaskImage:
              "radial-gradient(circle 90px at var(--sx, -9999px) var(--sy, -9999px), transparent 55%, rgba(0,0,0,0.5) 80%, black 100%)",
          } as React.CSSProperties}
        >
          <TypewriterTitle
            as="h1"
            className="text-[clamp(3.5rem,14vw,14rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase"
            speed={70}
            delay={800}
          >
            PRECYZJA.
          </TypewriterTitle>
          <TypewriterTitle
            as="span"
            className="text-[clamp(3.5rem,14vw,14rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase block"
            speed={70}
            delay={1400}
          >
            PRZEWAGA.
          </TypewriterTitle>
        </div>

        {/* Subtle dark overlay on top */}
        <div className="absolute inset-0 z-[3] bg-bg/15 pointer-events-none" />

        {/* Nightvision reticle overlay */}
        <div
          ref={scopeReticleRef}
          className="absolute top-0 left-0 z-[4] pointer-events-none opacity-0 transition-opacity duration-300 hidden md:block"
        >
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none" className="text-accent">
            {/* Outer circle */}
            <circle cx="90" cy="90" r="85" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            {/* Inner circle */}
            <circle cx="90" cy="90" r="45" stroke="currentColor" strokeWidth="0.4" opacity="0.15" strokeDasharray="4 3" />
            {/* Crosshair lines */}
            <line x1="90" y1="5" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="90" y1="140" x2="90" y2="175" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="5" y1="90" x2="40" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="140" y1="90" x2="175" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            {/* Center dot */}
            <circle cx="90" cy="90" r="2" fill="currentColor" opacity="0.4" />
            {/* Tick marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const r1 = 82;
              const r2 = 88;
              return (
                <line
                  key={deg}
                  x1={90 + Math.cos(rad) * r1}
                  y1={90 + Math.sin(rad) * r1}
                  x2={90 + Math.cos(rad) * r2}
                  y2={90 + Math.sin(rad) * r2}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.2"
                />
              );
            })}
          </svg>
        </div>

        {/* HUD UI layer + bottom content */}
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <div className="absolute top-[100px] left-16 font-[var(--font-mono)] text-[11px] text-accent leading-[2.2] opacity-60 hidden md:block">
            <div>// PL-2026</div>
            <div>// KRAKÓW, PL</div>
          </div>
          <div className="absolute top-[100px] right-16 font-[var(--font-mono)] text-[11px] text-accent text-right leading-[2.2] opacity-60 hidden md:block">
            <div ref={coordLatRef}>[ 050°04&apos;00&quot;N ]</div>
            <div ref={coordLngRef}>[ 019°57&apos;00&quot;E ]</div>
            <div>[ BEZ // OBR ]</div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 md:right-16 pointer-events-auto">
            <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-4 md:mb-6 block">
              // HYDRA ARMS - PL-2026
            </span>
            <SplitText
              as="p"
              className="text-[clamp(1.5rem,4.76vw,72px)] font-normal text-text-dim leading-[1.2] md:leading-[76px] tracking-[-2px]"
              splitBy="words"
              staggerAmount={0.06}
              delay={0.6}
            >
              Zaawansowana inżynieria obronna Obrót nowoczesnym uzbrojeniem
            </SplitText>

            <div className="flex gap-6 mt-6 md:gap-12 md:mt-8 items-center">
              <ScrambleLink
                href="/uslugi"
                className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] hover:text-white transition-colors duration-300"
              >
                [ Nasze usługi ]
              </ScrambleLink>
              <ScrambleLink
                href="#"
                className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] hover:text-white transition-colors duration-300"
              >
                [ Sklep ]
              </ScrambleLink>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SCROLL / SERVICES SECTION — sticks to hero ─── */}
      <section>
        <div ref={servicesWrapRef} className="relative">
          {services.map((service, i) => (
            <div
              key={service.id}
              ref={(el) => { serviceRefs.current[i] = el; }}
              className="sticky top-0 min-h-screen border-t border-white/5"
              style={{ zIndex: i + 1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[0.75fr_1fr] min-h-screen bg-bg">
                {/* Left — image with military overlay */}
                <div className="relative min-h-[300px] md:min-h-0 overflow-hidden">
                  <Image
                    src={service.img}
                    alt={service.title}
                    fill
                    className="object-cover grayscale brightness-[0.45] contrast-[1.1] sepia-[0.15]"
                  />
                  <div className="absolute inset-0 bg-[#0a1a0a]/40 mix-blend-multiply" />
                  <div className="moving-grain !opacity-[0.08]" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(19,255,21,0.12) 2px, rgba(19,255,21,0.12) 4px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(5,5,5,0.6)_100%)]" />
                  <div className="absolute bottom-8 left-8 font-[var(--font-mono)] text-[11px] text-accent/40 tracking-[0.2em]">
                    {service.id}/{String(services.length).padStart(2, "0")}
                  </div>
                </div>

                {/* Right — content */}
                <div className="border-l border-text-dim/25 px-5 md:px-10 flex flex-col justify-center py-10 md:py-0">
                  <div className="max-w-[600px]">
                    <div className="flex items-center justify-between mb-6 md:mb-10">
                      <span className="text-[16px] md:text-[18px] font-medium text-text-dim">
                        {service.label}
                      </span>
                      <div className="border border-text/50 px-2 py-1">
                        <span className="text-[16px] md:text-[18px]">
                          <span className="text-accent">{service.id}</span>
                          <span className="text-white/30">/{String(services.length).padStart(2, "0")}</span>
                        </span>
                      </div>
                    </div>

                    <h2 className="text-[clamp(1.8rem,4vw,48px)] font-light text-text leading-[1.1] md:leading-[53px] tracking-[-0.48px] mb-6 md:mb-9">
                      {service.title}
                    </h2>
                    <p className="text-[16px] md:text-[18px] font-light text-text-dim leading-[26px] md:leading-[28px] mb-6 md:mb-8">
                      {service.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex gap-2.5 items-center py-2.5 flex-wrap mb-8">
                      {service.tags.map((tag, ti) => (
                        <span key={ti} className="flex items-center gap-2.5">
                          <span className="font-[var(--font-mono)] text-[20px] text-accent tracking-[0.2px]">
                            {tag}
                          </span>
                          {ti < service.tags.length - 1 && (
                            <span className="w-[5px] h-[5px] bg-[#d9d9d9]" />
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="border border-accent/40 px-14 py-2.5 inline-flex items-center">
                      <ScrambleLink href="/uslugi" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                        [ Szczegóły → ]
                      </ScrambleLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DESCRIPTION SECTION ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-[clamp(24px,4vw,64px)] py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //02 O NAS
          </span>
        </div>
        <div className="py-10 md:py-20 px-[clamp(24px,4vw,64px)]">
          <ScrollRevealText
            text="Realizujemy krytyczne projekty z zakresu wytwarzania uzbrojenia oraz technologii dual-use. Łączymy rygorystyczne standardy NATO z precyzją nowoczesnych technologii tworząc innowacje. Prowadzimy również działalność handlową na rynku cywilnym i specjalnym."
            className="text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[1.3] md:leading-[53px] tracking-[-0.48px] text-left"
            indent={2}
          />
          <div className="flex justify-end mt-8">
            <ScrambleLink
              href="/o-nas"
              className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
            >
              [ Zobacz więcej ]
            </ScrambleLink>
          </div>
        </div>
      </section>

      {/* ─── VIDEO SECTION ─── */}
      <div ref={videoSectionRef} className="h-[280px] md:h-[549px] bg-bg relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.5] contrast-[1.15] sepia-[0.15]"
        >
          <source src="/soldiers.mp4" type="video/mp4" />
        </video>
        {/* Dark green tint */}
        <div className="absolute inset-0 bg-[#0a1a0a]/30 mix-blend-multiply z-[1]" />
        {/* Grain */}
        <div className="moving-grain !opacity-[0.08]" style={{ zIndex: 1 }} />
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(19,255,21,0.12) 2px, rgba(19,255,21,0.12) 4px)",
          }}
        />
        {/* Top gradient fade */}
        <div
          className="absolute top-0 left-0 right-0 h-full z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--color-bg) 0%, var(--color-bg) 5%, transparent 55%)" }}
        />
        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-full z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--color-bg) 0%, var(--color-bg) 5%, transparent 55%)" }}
        />
      </div>

      {/* ─── POTENCJAŁ I OPOWIEDZIALNOŚĆ ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-[clamp(24px,4vw,64px)] py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //03 POTENCJAŁ
          </span>
        </div>
        <div className="pt-8 md:pt-16 px-[clamp(24px,4vw,64px)]">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,9.26vw,140px)] font-normal text-text leading-[1] tracking-[-1px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            POTENCJAŁ I OPOWIEDZIALNOŚĆ
          </TypewriterTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pb-8 md:gap-16 md:mt-16 md:pb-16">
            <div>
              <p className="text-text-dim text-[18px] font-normal leading-[30px]">
                HYDRA ARMS to krakowski ośrodek kompetencyjny dedykowany dla sektora
                Security & Defense. Specjalizujemy się w wytwarzaniu zaawansowanych
                komponentów o wysokim stopniu skomplikowania.
              </p>
            </div>
            <div className="hidden md:flex items-start justify-end">
              <div className="w-[100px] h-[100px] border border-white/10 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-dim">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 FILARY ─── */}
      <section className="relative">
        {/* Full-width top border line */}
        <div className="border-t border-white/[0.25]" />

        {/* Section label — absolutely positioned over the cards */}
        <div className="absolute top-0 left-0 px-[clamp(24px,4vw,64px)] py-2 z-10 pointer-events-none">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //04 DYSTRYBUCJA
          </span>
        </div>

        {/* 3-card grid — width constrained to vertical grid lines (32px margins) */}
        <div className="mx-[clamp(24px,4vw,64px)] grid grid-cols-1 md:grid-cols-3 h-auto md:h-[680px] pt-10 md:pt-0">

          {/* ── B2G — Heksagonalna siatka strukturalna ── */}
          <div className="md:border-r border-b border-white/[0.08] flex flex-col justify-between px-6 py-8 md:px-10 md:py-12">
            <div className="hidden md:flex flex-1 items-center justify-center">
              <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
                {/* 3 nested hexagons — alternating rotation */}
                {([78, 52, 26] as number[]).map((r, k) => {
                  const offset = k % 2 === 0 ? -Math.PI / 2 : -Math.PI / 6;
                  const pts = Array.from({ length: 6 }, (_, j) => {
                    const a = (j / 6) * Math.PI * 2 + offset;
                    return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`;
                  }).join(" ");
                  return <polygon key={k} points={pts}
                    stroke="currentColor"
                    strokeWidth={k === 0 ? "1.0" : "0.7"}
                    fill="none"
                    opacity={0.55 - k * 0.1} />;
                })}
                {/* 6 spokes from center to outer vertices */}
                {Array.from({ length: 6 }, (_, k) => {
                  const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
                  return <line key={k} x1="100" y1="100"
                    x2={(100 + Math.cos(a) * 78).toFixed(1)}
                    y2={(100 + Math.sin(a) * 78).toFixed(1)}
                    stroke="currentColor" strokeWidth="0.5" opacity="0.22" />;
                })}
              </svg>
            </div>
            <div>
              <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">B2G</div>
              <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">{filary[0].title}</h3>
              <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8">{filary[0].desc}</p>
              <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                [ Dowiedz się więcej ]
              </ScrambleLink>
            </div>
          </div>

          {/* ── B2B — Walec (komponent obrabiany CNC) ── */}
          <div className="md:border-r border-b border-white/[0.08] flex flex-col justify-between px-6 py-8 md:px-10 md:py-12">
            <div className="hidden md:flex flex-1 items-center justify-center">
              <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
                {/* Top face ellipse */}
                <ellipse cx="100" cy="58" rx="72" ry="20" stroke="currentColor" strokeWidth="1.0" opacity="0.6" />
                {/* Side edges */}
                <line x1="28" y1="58" x2="28" y2="152" stroke="currentColor" strokeWidth="1.0" opacity="0.55" />
                <line x1="172" y1="58" x2="172" y2="152" stroke="currentColor" strokeWidth="1.0" opacity="0.55" />
                {/* Bottom arc (visible half) */}
                <path d="M 28,152 A 72,20 0 0 0 172,152" stroke="currentColor" strokeWidth="1.0" opacity="0.5" fill="none" />
                {/* Inner bore — top face */}
                <ellipse cx="100" cy="58" rx="28" ry="8" stroke="currentColor" strokeWidth="0.65" opacity="0.35" />
                {/* Section line at 1/3 height */}
                <ellipse cx="100" cy="102" rx="72" ry="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 4" opacity="0.22" />
              </svg>
            </div>
            <div>
              <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">B2B</div>
              <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">{filary[1].title}</h3>
              <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8">{filary[1].desc}</p>
              <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                [ Dowiedz się więcej ]
              </ScrambleLink>
            </div>
          </div>

          {/* ── B2C — Tarcza strzelnicza (rynek cywilny) ── */}
          <div className="border-b border-white/[0.08] flex flex-col justify-between px-6 py-8 md:px-10 md:py-12">
            <div className="hidden md:flex flex-1 items-center justify-center">
              <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
                {[84, 66, 48, 30, 14].map((r, k) => (
                  <circle key={k} cx="100" cy="100" r={r}
                    stroke="currentColor"
                    strokeWidth={k === 0 ? "1.0" : "0.7"}
                    opacity={0.55 - k * 0.08}
                    fill="none" />
                ))}
                <line x1="100" y1="8" x2="100" y2="22" stroke="currentColor" strokeWidth="0.7" opacity="0.38" />
                <line x1="100" y1="178" x2="100" y2="192" stroke="currentColor" strokeWidth="0.7" opacity="0.38" />
                <line x1="8" y1="100" x2="22" y2="100" stroke="currentColor" strokeWidth="0.7" opacity="0.38" />
                <line x1="178" y1="100" x2="192" y2="100" stroke="currentColor" strokeWidth="0.7" opacity="0.38" />
              </svg>
            </div>
            <div>
              <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">B2C</div>
              <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">{filary[2].title}</h3>
              <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8">{filary[2].desc}</p>
              <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                [ Dowiedz się więcej ]
              </ScrambleLink>
            </div>
          </div>

        </div>
      </section>

      {/* ─── MAP SECTION ─── */}
      <section>
        <div className="h-[300px] md:h-[542px] bg-[#080808] relative overflow-hidden border-t border-white/[0.25]">
          <MilitaryMap />

          {/* HUD crosshair cursor */}
          <MapCrosshair />

          {/* Right info panel with gradient backdrop */}
          <div
            className="absolute right-0 top-0 w-full md:w-[45%] h-full z-[3] px-6 py-4 md:px-[52px] md:py-[20px] pointer-events-none hidden md:block"
            style={{ backgroundImage: "linear-gradient(60deg, rgba(10,10,11,0) 0%, rgb(10,10,11) 38%)" }}
          >
            <h3 className="text-text-dim text-[28px] font-medium leading-[34px] mb-6">
              HYDRA ARMS SP. Z O.O.
            </h3>

            <div className="font-[var(--font-mono)] text-[16px] tracking-[0.8px] leading-[24px] text-text-dim space-y-0">
              <p>[<span className="text-accent">→</span>]  Kraków, Polska</p>
              <p>[<span className="text-accent">→</span>]  50°04&apos;N  019°57&apos;E</p>
              <p>[<span className="text-accent">→</span>]  Droga krajowa S7</p>
              <p>[<span className="text-accent">→</span>]  Trasa północ–południe</p>
              <p>[<span className="text-accent">→</span>]  Punkt handlowo-biurowy</p>
            </div>

            <div className="mt-8 pointer-events-auto">
              <ScrambleLink
                href="https://maps.google.com/?q=50.06,19.94"
                target="_blank"
                rel="noopener noreferrer"
                className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]"
              >
                [ Wyznacz Trasę → ]
              </ScrambleLink>
            </div>
          </div>
        </div>
      </section>

      {/* Map mobile info — shown only on mobile */}
      <div className="block md:hidden border-b border-white/[0.08] px-8 py-6">
        <h3 className="text-text-dim text-[18px] font-medium mb-3">HYDRA ARMS SP. Z O.O.</h3>
        <div className="font-[var(--font-mono)] text-[13px] tracking-[0.5px] leading-[2] text-text-dim">
          <p>[<span className="text-accent">→</span>] Kraków, Polska</p>
          <p>[<span className="text-accent">→</span>] 50°04&apos;N  019°57&apos;E</p>
        </div>
        <a
          href="https://maps.google.com/?q=50.06,19.94"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 font-[var(--font-mono)] text-[13px] text-accent tracking-[0.5px] hover:text-white transition-colors duration-300"
        >
          [ Wyznacz Trasę → ]
        </a>
      </div>

      {/* ─── KONTAKT — TERMINAL ─── */}
      <section className="border-t border-white/[0.25] px-[clamp(24px,4vw,64px)] py-16">
        <div className="max-w-[1100px] mx-auto">
          {/* Terminal window */}
          <div className="border border-accent/20 bg-[#060806] relative overflow-hidden">
            {/* Scanlines overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 4px)",
              }}
            />
            {/* CRT glow */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                boxShadow: "inset 0 0 80px color-mix(in srgb, var(--color-accent) 3%, transparent)",
              }}
            />

            {/* Title bar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-accent/15 bg-accent/[0.04]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
              </div>
              <span className="font-[var(--font-mono)] text-[11px] text-accent/50 tracking-[0.15em] uppercase">
                hydra-arms@terminal:~/kontakt
              </span>
            </div>

            {/* Terminal body */}
            <div className="relative z-[2] p-6 md:p-8">
              {/* Boot-up header */}
              <div className="font-[var(--font-mono)] text-[11px] text-accent/40 leading-[1.8] mb-6">
                <div>HYDRA ARMS — BEZPIECZNY KANAŁ ŁĄCZNOŚCI v2.4.1</div>
                <div>Inicjalizacja szyfrowanego kanału... <span className="text-accent/70">OK</span></div>
                <div>Połączenie nawiązane. Oczekiwanie na dane wejściowe.</div>
                <div className="mt-2 border-t border-accent/10 pt-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left — contact info as terminal output */}
                <div>
                  <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-4">
                    $ cat /etc/hydra/contact.conf
                  </div>
                  <div className="font-[var(--font-mono)] text-[13px] leading-[2.2] space-y-0">
                    <p className="text-text-dim">
                      <span className="text-accent/50">R&D</span>{" "}
                      <span className="text-accent">research@hydra-arms.com</span>
                    </p>
                    <p className="text-text-dim">
                      <span className="text-accent/50">B2G</span>{" "}
                      <span className="text-accent">gov@hydra-arms.com</span>
                    </p>
                    <p className="text-text-dim">
                      <span className="text-accent/50">HANDEL</span>{" "}
                      <span className="text-accent">sprzedaz@hydra-arms.com</span>
                    </p>
                    <p className="text-text-dim">
                      <span className="text-accent/50">BIURO</span>{" "}
                      <span className="text-accent">office@hydra-arms.com</span>
                    </p>
                  </div>

                  <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mt-6 mb-3">
                    $ hydra --status
                  </div>
                  <div className="font-[var(--font-mono)] text-[12px] text-accent/30 leading-[2]">
                    <div>SZYFROWANIE: <span className="text-accent/60">AES-256</span></div>
                    <div>PROTOKÓŁ:    <span className="text-accent/60">TLS 1.3</span></div>
                    <div>STATUS:      <span className="text-accent">AKTYWNY</span> <span className="terminal-blink">█</span></div>
                  </div>
                </div>

                {/* Right — form as terminal input */}
                <div className="md:border-l border-accent/10 md:pl-8">
                  <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-4">
                    $ hydra --wyslij-wiadomosc
                  </div>
                  <form className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                      <input
                        type="text"
                        placeholder="IMIĘ"
                        className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                      />
                    </div>
                    <div className="border-t border-accent/5" />
                    <div className="flex items-center gap-2">
                      <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                      <input
                        type="email"
                        placeholder="EMAIL"
                        className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                      />
                    </div>
                    <div className="border-t border-accent/5" />
                    <div className="flex items-center gap-2">
                      <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                      <input
                        type="text"
                        placeholder="TYTUŁ"
                        className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                      />
                    </div>
                    <div className="border-t border-accent/5" />
                    <div className="flex items-start gap-2">
                      <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0 pt-0.5">&gt;</span>
                      <textarea
                        placeholder="TREŚĆ WIADOMOŚCI"
                        rows={4}
                        className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none resize-none placeholder:text-accent/20 caret-accent"
                      />
                    </div>
                    <div className="border-t border-accent/5" />
                    <div className="flex items-start gap-2 mt-2">
                      <input type="checkbox" className="mt-0.5 accent-accent" />
                      <span className="font-[var(--font-mono)] text-[11px] text-accent/30 leading-[1.6]">
                        Wyrażam zgodę na przetwarzanie danych przez HYDRA ARMS
                        w celu inicjacji procedury kontaktowej. Akceptuję{" "}
                        <a href="/polityka-prywatnosci" className="text-accent/60 hover:text-accent transition-colors">
                          Politykę Prywatności
                        </a>.
                      </span>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="font-[var(--font-mono)] text-[13px] border border-accent/40 px-6 py-2 tracking-[1px] text-accent hover:bg-accent hover:text-bg transition-all duration-300"
                      >
                        [ WYŚLIJ ]
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
