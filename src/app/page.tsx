"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimateIn from "@/components/AnimateIn";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import MilitaryMap from "@/components/MilitaryMap";
import MapCrosshair from "@/components/MapCrosshair";
import TypewriterTitle from "@/components/TypewriterTitle";
import DrawCard from "@/components/DrawCard";
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
    title: "Sektor rządowy",
    desc: "Zamówienia dla jednostek wojskowych, służb mundurowych i instytucji państwowych realizowane w ramach ścisłych procedur bezpieczeństwa.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <path d="M24 4 L44 18 L44 38 L24 44 L4 38 L4 18 Z" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M24 4 L24 44 M4 18 L44 18" stroke="#b8d95a" strokeWidth="0.6" opacity="0.3" className="draw-icon" />
      </svg>
    ),
  },
  {
    tag: "B2B",
    title: "Kooperacja przemysłowa",
    desc: "Współpraca z partnerami przemysłowymi w zakresie prototypowania, produkcji seryjnej i integracji systemów obronnych.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect x="6" y="14" width="36" height="28" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M16 14 L16 8 L32 8 L32 14" stroke="#b8d95a" strokeWidth="1" opacity="0.5" className="draw-icon" />
        <line x1="6" y1="28" x2="42" y2="28" stroke="#b8d95a" strokeWidth="0.6" opacity="0.3" className="draw-icon" />
      </svg>
    ),
  },
  {
    tag: "B2C",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <circle cx="24" cy="16" r="10" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M8 44 Q8 30 24 30 Q40 30 40 44" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <line x1="24" y1="6" x2="24" y2="26" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" className="draw-icon" />
      </svg>
    ),
  },
];

/* ──────────── PAGE ──────────── */

export default function HomePage() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const scopeOverlayRef = useRef<HTMLDivElement>(null);
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
    const scopeOv = scopeOverlayRef.current;
    const reticle = scopeReticleRef.current;
    if (!hero || !scopeOv || !reticle) return;

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
      scopeOv.style.setProperty("--sx", `${curX}px`);
      scopeOv.style.setProperty("--sy", `${curY}px`);
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
        scopeOv.style.setProperty("--sx", `${curX}px`);
        scopeOv.style.setProperty("--sy", `${curY}px`);
        reticle.style.transform = `translate(${curX - RADIUS}px, ${curY - RADIUS}px)`;
        reticle.style.opacity = "1";
        raf = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      scopeOv.style.setProperty("--sx", "-9999px");
      scopeOv.style.setProperty("--sy", "-9999px");
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
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-bg">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[15] pointer-events-none"
        />

        {/* Video background — full cover */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Text cutout mask — black bg with mix-blend-multiply reveals video through text */}
        <div className="absolute inset-0 z-[3] bg-black mix-blend-multiply flex flex-col justify-center px-[clamp(24px,4vw,80px)]">
          <TypewriterTitle
            as="h1"
            className="text-[clamp(6rem,14vw,14rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase"
            speed={70}
            delay={800}
          >
            PRECYZJA.
          </TypewriterTitle>
          <TypewriterTitle
            as="span"
            className="text-[clamp(6rem,14vw,14rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase block"
            speed={70}
            delay={1400}
          >
            PRZEWAGA.
          </TypewriterTitle>
        </div>

        {/* Dark overlay with circular scope cutout — reveals bright video underneath */}
        <div
          ref={scopeOverlayRef}
          className="absolute inset-0 z-[2] pointer-events-none hidden md:block"
          style={{
            background: "rgba(10,10,11,0.55)",
            maskImage: "radial-gradient(circle 90px at var(--sx, -9999px) var(--sy, -9999px), transparent 70%, black 100%)",
            WebkitMaskImage: "radial-gradient(circle 90px at var(--sx, -9999px) var(--sy, -9999px), transparent 70%, black 100%)",
          } as React.CSSProperties}
        />

        {/* Nightvision reticle overlay */}
        <div
          ref={scopeReticleRef}
          className="absolute top-0 left-0 z-[4] pointer-events-none opacity-0 transition-opacity duration-300 hidden md:block"
        >
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
            {/* Outer circle */}
            <circle cx="90" cy="90" r="85" stroke="#b8d95a" strokeWidth="0.5" opacity="0.25" />
            {/* Inner circle */}
            <circle cx="90" cy="90" r="45" stroke="#b8d95a" strokeWidth="0.4" opacity="0.15" strokeDasharray="4 3" />
            {/* Crosshair lines */}
            <line x1="90" y1="5" x2="90" y2="40" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" />
            <line x1="90" y1="140" x2="90" y2="175" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" />
            <line x1="5" y1="90" x2="40" y2="90" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" />
            <line x1="140" y1="90" x2="175" y2="90" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" />
            {/* Center dot */}
            <circle cx="90" cy="90" r="2" fill="#b8d95a" opacity="0.4" />
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
                  stroke="#b8d95a"
                  strokeWidth="0.5"
                  opacity="0.2"
                />
              );
            })}
          </svg>
        </div>

        {/* Subtle dark overlay on top */}
        <div className="absolute inset-0 z-[3] bg-bg/15 pointer-events-none" />

        {/* HUD UI layer + bottom content */}
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <div className="absolute top-[100px] left-[clamp(24px,4vw,80px)] font-[var(--font-mono)] text-[11px] text-accent leading-[2.2] opacity-60 hidden md:block">
            <div>// PL-2026</div>
            <div>// KRAKÓW, PL</div>
          </div>
          <div className="absolute top-[100px] right-[clamp(24px,4vw,80px)] font-[var(--font-mono)] text-[11px] text-accent text-right leading-[2.2] opacity-60 hidden md:block">
            <div ref={coordLatRef}>[ 050°04&apos;00&quot;N ]</div>
            <div ref={coordLngRef}>[ 019°57&apos;00&quot;E ]</div>
            <div>[ BEZ // OBR ]</div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-16 left-16 right-16 pointer-events-auto">
            <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-6 block">
              // HYDRA ARMS - PL-2026
            </span>
            <SplitText
              as="p"
              className="text-[clamp(2rem,4.76vw,72px)] font-normal text-text-dim leading-[76px] tracking-[-2px]"
              splitBy="words"
              staggerAmount={0.06}
              delay={0.6}
            >
              Zaawansowana inżynieria obronna Obrót nowoczesnym uzbrojeniem
            </SplitText>

            <div className="flex gap-12 mt-8 items-center">
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
              className="sticky top-0 h-screen border-t border-white/5"
              style={{ zIndex: i + 1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[0.75fr_1fr] h-full bg-bg">
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
                <div className="border-l border-text-dim/25 px-10 flex flex-col justify-center">
                  <div className="max-w-[600px]">
                    <div className="flex items-center justify-between mb-10">
                      <span className="text-[18px] font-medium text-text-dim">
                        {service.label}
                      </span>
                      <div className="border border-text/50 px-2 py-1">
                        <span className="text-[18px]">
                          <span className="text-accent">{service.id}</span>
                          <span className="text-white/30">/{String(services.length).padStart(2, "0")}</span>
                        </span>
                      </div>
                    </div>

                    <h2 className="text-[48px] font-light text-text leading-[53px] tracking-[-0.48px] mb-9">
                      {service.title}
                    </h2>
                    <p className="text-[18px] font-light text-text-dim leading-[28px] mb-8">
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

                    <a
                      href="/uslugi"
                      className="group font-[var(--font-mono)] text-[14px] tracking-[1.12px] border border-accent/40 px-6 py-2.5 hover:bg-accent hover:text-bg transition-all duration-300 inline-block"
                    >
                      <span className="text-text-dim text-2xl group-hover:text-bg transition-colors duration-300">[</span> <span className="text-accent group-hover:text-bg transition-colors duration-300">Szczegóły →</span> <span className="text-text-dim text-2xl group-hover:text-bg transition-colors duration-300">]</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DESCRIPTION SECTION ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //02 O NAS
          </span>
        </div>
        <div className="py-20 px-16">
          <ScrollRevealText
            text="Realizujemy krytyczne projekty z zakresu wytwarzania uzbrojenia oraz technologii dual-use. Łączymy rygorystyczne standardy NATO z precyzją nowoczesnych technologii tworząc innowacje. Prowadzimy również działalność handlową na rynku cywilnym i specjalnym."
            className="text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] text-left"
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
      <div ref={videoSectionRef} className="h-[549px] bg-bg relative overflow-hidden">
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
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //03 POTENCJAŁ
          </span>
        </div>
        <div className="px-16 pt-16">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(3rem,9.26vw,140px)] font-normal text-text leading-[1] tracking-[-2px] uppercase"
            speed={60}
          >
            POTENCJAŁ I OPOWIEDZIALNOŚĆ
          </TypewriterTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-16 pb-16">
            <div>
              <p className="text-text-dim text-[18px] font-normal leading-[30px]">
                HYDRA ARMS to krakowski ośrodek kompetencyjny dedykowany dla sektora
                Security & Defense. Specjalizujemy się w wytwarzaniu zaawansowanych
                komponentów o wysokim stopniu skomplikowania.
              </p>
            </div>
            <div className="flex items-start justify-end">
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
      <section>
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //04 DYSTRYBUCJA
          </span>
        </div>
        <div className="px-16 py-16">
          <ScrollRevealText
            text="Działamy w trzech strategicznych obszarach dystrybucji - od zamówień rządowych, przez kooperację przemysłową, po licencjonowany rynek cywilny. Każdy kanał obsługiwany jest zgodnie z obowiązującymi regulacjami prawnymi i standardami bezpieczeństwa."
            className="text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] text-left"
          />
          <div className="flex justify-end mt-8">
            <ScrambleLink
              href="/wspolpraca"
              className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
            >
              [ Rozpocznij współpracę ]
            </ScrambleLink>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-16 pb-16">
          {filary.map((item, i) => (
            <DrawCard key={i} delay={i * 0.2}>
              <div className="p-8 flex flex-col gap-5 h-full">
                <div className="mb-2">{item.icon}</div>
                <div className="border border-white/15 px-2 py-1 self-start">
                  <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[0.28px]">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-text text-[28px] font-medium leading-[34px]">
                  {item.title}
                </h3>
                <p className="text-text-dim text-[14px] font-normal leading-[21px]">
                  {item.desc}
                </p>
                <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] mt-auto">
                  [ Więcej ]
                </ScrambleLink>
              </div>
            </DrawCard>
          ))}
        </div>
      </section>

      {/* ─── MAP SECTION ─── */}
      <section>
        <div className="h-[542px] bg-[#080808] relative overflow-hidden border-t border-white/[0.25]">
          <MilitaryMap />

          {/* HUD crosshair cursor */}
          <MapCrosshair />

          {/* Right info panel with gradient backdrop */}
          <div
            className="absolute right-0 top-0 w-[45%] h-full z-[3] px-[52px] py-[20px] pointer-events-none"
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
              <a
                href="https://maps.google.com/?q=50.06,19.94"
                target="_blank"
                rel="noopener noreferrer"
                className="group font-[var(--font-mono)] text-[20px] tracking-[0.2px] hover:text-white transition-colors duration-300"
              >
                <span className="text-text-dim group-hover:text-white transition-colors duration-300">[</span> <span className="text-accent group-hover:text-white transition-colors duration-300">Wyznacz Trasę →</span> <span className="text-text-dim group-hover:text-white transition-colors duration-300">]</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── KONTAKT — TERMINAL ─── */}
      <section className="border-t border-white/[0.25] px-[clamp(24px,4vw,80px)] py-16">
        <div className="max-w-[1100px] mx-auto">
          {/* Terminal window */}
          <div className="border border-accent/20 bg-[#060806] relative overflow-hidden">
            {/* Scanlines overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(184,217,90,0.15) 2px, rgba(184,217,90,0.15) 4px)",
              }}
            />
            {/* CRT glow */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                boxShadow: "inset 0 0 80px rgba(184,217,90,0.03)",
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
                <div className="border-l border-accent/10 pl-6 md:pl-8">
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
