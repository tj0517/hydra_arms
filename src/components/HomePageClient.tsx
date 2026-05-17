"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import MilitaryMap from "@/components/MilitaryMap";
import MapCrosshair from "@/components/MapCrosshair";
import TypewriterTitle from "@/components/TypewriterTitle";
import Image from "next/image";
import CornerCTA from "@/components/ui/CornerCTA";
import SectionLabel from "@/components/ui/SectionLabel";
import ClientSegmentsGrid from "@/components/sections/ClientSegmentsGrid";

gsap.registerPlugin(ScrollTrigger);

/* ──────────── DATA ──────────── */

type Service = { id: string; label: string; title: string; desc: string; tags: string[]; img: string }
type Filar = { tag: string; title: string; desc: string; img: string; href: string }

const DEFAULT_SERVICES: Service[] = [
  {
    id: "01",
    label: "Projektowanie i R&D",
    title: "Projektowanie i badania rozwojowe",
    desc: "Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.",
    tags: ["CAD/CAM", "Analizy MES", "Inżynieria odwrotna"],
    img: "/img/service-01.jpg",
  },
  {
    id: "02",
    label: "Produkcja",
    title: "Produkcja komponentów",
    desc: "Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem precyzyjnych technologii CNC, obróbki cieplnej i kontroli jakości zgodnej ze standardami NATO.",
    tags: ["CNC", "Obróbka cieplna", "Kontrola jakości"],
    img: "/img/service-02.jpg",
  },
  {
    id: "03",
    label: "Dystrybucja",
    title: "Obrót i dystrybucja",
    desc: "Prowadzimy licencjonowaną działalność handlową w zakresie broni, amunicji oraz wyposażenia specjalnego dla sektora obronnego i odbiorców cywilnych.",
    tags: ["B2G", "B2B", "Rynek cywilny"],
    img: "/img/service-03.jpg",
  },
  {
    id: "04",
    label: "Serwis",
    title: "Serwis i modernizacja",
    desc: "Zapewniamy kompleksowy serwis techniczny, modernizację istniejących systemów uzbrojenia oraz dostosowanie do aktualnych standardów operacyjnych.",
    tags: ["Modernizacja", "Diagnostyka", "Kalibracja"],
    img: "/img/service-04.jpg",
  },
];

const DEFAULT_FILARY: Filar[] = [
  {
    tag: "B2G",
    title: "Zamówienia rządowe",
    desc: "Dostawy dla jednostek wojskowych, służb mundurowych i instytucji państwowych realizowane w ramach ścisłych procedur bezpieczeństwa i zamówień publicznych.",
    img: "/img/vest-blueprint.png",
    href: "/wspolpraca",
  },
  {
    tag: "B2B",
    title: "Kooperacja przemysłowa",
    desc: "Współpraca z partnerami przemysłowymi w zakresie prototypowania, produkcji seryjnej komponentów i integracji systemów obronnych na zamówienie.",
    img: "/img/cnc-drill-blueprint.png",
    href: "/wspolpraca",
  },
  {
    tag: "B2C",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych zgodnie z obowiązującymi regulacjami.",
    img: "/img/scope-blueprint.png",
    href: "/wspolpraca",
  },
];

const DEFAULT_HERO_TAGLINE1 = "Zaawansowana inżynieria obronna";
const DEFAULT_HERO_TAGLINE2 = "Obrót nowoczesnym uzbrojeniem";
const DEFAULT_HUD_LABEL = "// HYDRA ARMS - PL-2026";
const DEFAULT_ABOUT_TEXT = "Realizujemy krytyczne projekty z zakresu wytwarzania uzbrojenia oraz technologii dual-use. Łączymy rygorystyczne standardy NATO z precyzją nowoczesnych technologii tworząc innowacje. Prowadzimy również działalność handlową na rynku cywilnym i specjalnym.";
const DEFAULT_HERO_VIDEO = "/video/hero-overflow.mp4";

interface HomePageClientProps {
  services?: Service[]
  filary?: Filar[]
  heroTagline1?: string
  heroTagline2?: string
  hudLabel?: string
  aboutText?: string
  heroVideo?: string
}

/* ──────────── PAGE ──────────── */

export default function HomePageClient({
  services = DEFAULT_SERVICES,
  filary = DEFAULT_FILARY,
  heroTagline1 = DEFAULT_HERO_TAGLINE1,
  heroTagline2 = DEFAULT_HERO_TAGLINE2,
  hudLabel = DEFAULT_HUD_LABEL,
  aboutText = DEFAULT_ABOUT_TEXT,
  heroVideo = DEFAULT_HERO_VIDEO,
}: HomePageClientProps = {}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const coordLatRef = useRef<HTMLDivElement>(null);
  const coordLngRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const lineXRef = useRef<HTMLDivElement>(null);
  const lineYRef = useRef<HTMLDivElement>(null);
  const coordDisplayRef = useRef<HTMLSpanElement>(null);
  const heroOverflowRef = useRef<HTMLDivElement>(null);
  const beznazwyVideoRef = useRef<HTMLVideoElement>(null);
  const beznazwyWrapperRef = useRef<HTMLDivElement>(null);
  const glitchOverlayRef = useRef<HTMLDivElement>(null);
  const overflowVideoInnerRef = useRef<HTMLVideoElement>(null);
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

  /* ── Glitch on video loop — triggers before loop to hide the cut ── */
  useEffect(() => {
    const video = beznazwyVideoRef.current;
    const hero = heroRef.current;
    const overlay = glitchOverlayRef.current;
    if (!video || !hero || !overlay) return;
    let triggered = false;
    const onTimeUpdate = () => {
      const curr = video.currentTime;
      const dur = video.duration;
      if (isNaN(dur)) return;
      // Trigger 0.35s before end so flash peaks right at the loop frame
      if (!triggered && curr > dur - 0.35) {
        triggered = true;
        hero.classList.remove("hero-loop-glitch");
        void hero.offsetWidth;
        hero.classList.add("hero-loop-glitch");
        overlay.classList.remove("hero-loop-flash");
        void overlay.offsetWidth;
        overlay.classList.add("hero-loop-flash");
        setTimeout(() => { hero.classList.remove("hero-loop-glitch"); overlay.classList.remove("hero-loop-flash"); }, 650);
      }
      // Reset after loop happened
      if (triggered && curr < 0.5) triggered = false;
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  /* ── Sync hero-overflow video to beznazwy ── */
  useEffect(() => {
    const bg = beznazwyVideoRef.current;
    const fg = overflowVideoInnerRef.current;
    if (!bg || !fg) return;
    const sync = () => { if (Math.abs(fg.currentTime - bg.currentTime) > 0.1) fg.currentTime = bg.currentTime; };
    const interval = setInterval(sync, 500);
    fg.addEventListener("loadedmetadata", sync);
    return () => { clearInterval(interval); fg.removeEventListener("loadedmetadata", sync); };
  }, []);

  /* ── Cursor → scope crosshair + video reveal ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;
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
      const lat = 50.02 + (1 - py) * 0.08;
      const lng = 19.88 + px * 0.14;
      if (coordLatRef.current) coordLatRef.current.textContent = `[ ${formatCoord(lat, "N", "S")} ]`;
      if (coordLngRef.current) coordLngRef.current.textContent = `[ ${formatCoord(lng, "E", "W")} ]`;
    };
    const crosshair = crosshairRef.current;
    const lx = lineXRef.current;
    const ly = lineYRef.current;
    const coordDisplay = coordDisplayRef.current;
    const overflowVid = heroOverflowRef.current;
    const W = 80, H = 50; // half-width, half-height of scope rect (160×100)
    const clip = (x: number, y: number) =>
      `inset(${y - H}px calc(100% - ${x + W}px) calc(100% - ${y + H}px) ${x - W}px)`;
    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      updateCoords(curX, curY);
      if (overflowVid) overflowVid.style.clipPath = clip(curX, curY);
      if (crosshair) crosshair.style.transform = `translate(${curX}px, ${curY}px)`;
      if (lx) lx.style.transform = `translateY(${curY}px)`;
      if (ly) ly.style.transform = `translateX(${curX}px)`;
      if (coordDisplay) coordDisplay.textContent = `X:${Math.round(curX).toString().padStart(4, "0")}  Y:${Math.round(curY).toString().padStart(4, "0")}`;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!active) {
        active = true;
        curX = targetX; curY = targetY;
        if (overflowVid) overflowVid.style.clipPath = clip(curX, curY);
        if (crosshair) { crosshair.style.opacity = "1"; crosshair.style.transform = `translate(${curX}px, ${curY}px)`; }
        if (lx) { lx.style.opacity = "1"; lx.style.transform = `translateY(${curY}px)`; }
        if (ly) { ly.style.opacity = "1"; ly.style.transform = `translateX(${curX}px)`; }
        raf = requestAnimationFrame(tick);
      }
    };
    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      if (overflowVid) overflowVid.style.clipPath = "inset(50% 50% 50% 50%)";
      if (crosshair) crosshair.style.opacity = "0";
      if (lx) lx.style.opacity = "0";
      if (ly) ly.style.opacity = "0";
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
      <section ref={heroRef} className="relative h-[100dvh] overflow-hidden bg-bg cursor-none">
        <div ref={overlayRef} className="absolute inset-0 bg-bg z-[15] pointer-events-none" />

        <div ref={beznazwyWrapperRef} className="absolute inset-0">
          <video
            ref={beznazwyVideoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.15] brightness-[0.5] sepia-[0.08]"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>

        {/* hero-overflow — revealed by scope cursor via clip-path */}
        <div
          ref={heroOverflowRef}
          className="absolute inset-0 z-[1] pointer-events-none scope-glitch overflow-hidden"
          style={{ clipPath: "inset(50% 50% 50% 50%)" }}
        >
          <video
            ref={overflowVideoInnerRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.55] contrast-[1.2]"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Green tint */}
          <div className="absolute inset-0 bg-[#13FF15]/30 mix-blend-screen pointer-events-none" />
          <div className="absolute inset-0 bg-[#0a2a0a]/40 mix-blend-multiply pointer-events-none" />
          {/* Grain inside scope */}
          <div className="moving-grain !opacity-[0.18] !z-[2]" />
        </div>

        {/* Scope guide lines */}
        <div ref={lineXRef} className="absolute top-0 left-0 w-full h-px bg-accent/30 pointer-events-none opacity-0 transition-opacity duration-300 z-[8]" />
        <div ref={lineYRef} className="absolute top-0 left-0 w-px h-full bg-accent/30 pointer-events-none opacity-0 transition-opacity duration-300 z-[8]" />

        {/* Scope crosshair reticle */}
        <div
          ref={crosshairRef}
          className="absolute top-0 left-0 z-[9] pointer-events-none opacity-0 transition-opacity duration-300"
          style={{ marginLeft: -80, marginTop: -50 }}
        >
          <svg width="160" height="100" viewBox="0 0 160 100" fill="none">
            <rect x="1" y="1" width="158" height="98" stroke="#13FF15" strokeWidth="0.5" opacity="0.5" />
            <path d="M1 14 L1 1 L14 1" stroke="#13FF15" strokeWidth="1.5" fill="none" opacity="0.9" />
            <path d="M146 1 L159 1 L159 14" stroke="#13FF15" strokeWidth="1.5" fill="none" opacity="0.9" />
            <path d="M159 86 L159 99 L146 99" stroke="#13FF15" strokeWidth="1.5" fill="none" opacity="0.9" />
            <path d="M14 99 L1 99 L1 86" stroke="#13FF15" strokeWidth="1.5" fill="none" opacity="0.9" />
            <line x1="74" y1="50" x2="86" y2="50" stroke="#13FF15" strokeWidth="1" opacity="0.7" />
            <line x1="80" y1="44" x2="80" y2="56" stroke="#13FF15" strokeWidth="1" opacity="0.7" />
          </svg>
          <span
            ref={coordDisplayRef}
            className="absolute bottom-[8px] left-[10px] font-[var(--font-mono)] text-[9px] text-accent/60 tracking-[0.1em]"
          >
            X:0000  Y:0000
          </span>
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 30%, rgba(10,10,11,0.65) 75%, rgba(10,10,11,0.95) 100%)" }}
        />

        {/* Bottom gradient fade to bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[50%] z-[5] pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--color-bg) 0%, var(--color-bg) 30%, rgba(10,10,11,0.85) 60%, transparent 100%)" }}
        />

        {/* Grain */}
        <div className="moving-grain !opacity-[0.15]" style={{ zIndex: 3 }} />

        {/* Scanlines */}
        <div
          className="absolute inset-0 z-[4] pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)" }}
        />

        {/* Loop glitch flash overlay */}
        <div ref={glitchOverlayRef} className="absolute inset-0 z-[6] pointer-events-none opacity-0" />

        {/* HUD + bottom content */}
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

          <div className="absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 md:right-16 pointer-events-auto">
            <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-4 md:mb-6 block">
              {hudLabel}
            </span>
            <div>
              <SplitText
                as="p"
                className="text-[clamp(1.5rem,4.76vw,72px)] font-normal text-text-dim leading-[1.2] md:leading-[76px] tracking-[-2px]"
                splitBy="words"
                staggerAmount={0.06}
                delay={0.6}
              >
                {heroTagline1}
              </SplitText>
              <SplitText
                as="p"
                className="text-[clamp(1.5rem,4.76vw,72px)] font-normal text-text-dim leading-[1.2] md:leading-[76px] tracking-[-2px]"
                splitBy="words"
                staggerAmount={0.06}
                delay={0.9}
              >
                {heroTagline2}
              </SplitText>
            </div>
            <div className="flex gap-6 mt-6 md:gap-12 md:mt-8 items-center">
              <CornerCTA href="/uslugi" label="Nasze usługi" linkClassName="hover:text-white transition-colors duration-300" />
              <CornerCTA href="#" label="Sklep" linkClassName="hover:text-white transition-colors duration-300" />
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
                <div className="md:border-l border-text-dim/25 px-8 md:px-10 flex flex-col justify-center py-10 md:py-0">
                  <div className="max-w-[600px]">
                    <div className="flex items-center justify-between mb-6 md:mb-10">
                      <span className="text-[14px] md:text-[18px] font-medium text-text-dim">
                        {service.label}
                      </span>
                      <div className="relative px-3 py-1 inline-flex items-center">
                        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                        <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                        <span className="text-[16px] md:text-[18px]">
                          <span className="text-accent">{service.id}</span>
                          <span className="text-white/30">/{String(services.length).padStart(2, "0")}</span>
                        </span>
                      </div>
                    </div>

                    <h2 className="text-[clamp(1.5rem,4vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px] mb-6 md:mb-9">
                      {service.title}
                    </h2>
                    <p className="text-[15px] md:text-[18px] font-light text-text-dim leading-[1.7] md:leading-[28px] mb-6 md:mb-8 text-justify">
                      {service.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex gap-2.5 items-center py-2.5 flex-wrap mb-8">
                      {service.tags.map((tag, ti) => (
                        <span key={ti} className="flex items-center gap-2.5">
                          <span className="font-[var(--font-mono)] text-[13px] md:text-[20px] text-accent/70 md:text-accent tracking-[0.2px]">
                            {tag}
                          </span>
                          {ti < service.tags.length - 1 && (
                            <span className="w-[4px] h-[4px] md:w-[5px] md:h-[5px] bg-[#d9d9d9]/50 md:bg-[#d9d9d9]" />
                          )}
                        </span>
                      ))}
                    </div>

                    <CornerCTA href="/uslugi" label="Szczegóły →" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DESCRIPTION SECTION ─── */}
      <section>
        <SectionLabel label="//02 O NAS" />
        <div className="pt-12 md:pt-20 pb-0 px-[clamp(32px,5vw,64px)]">
          <ScrollRevealText
            text={aboutText}
            className="text-[clamp(1.4rem,3.17vw,48px)] font-light text-text-dim leading-[1.35] md:leading-[53px] tracking-[-0.48px] text-justify"
            indent={2}
          />
          <div className="flex justify-end mt-8">
            <CornerCTA href="/o-nas" label="Zobacz więcej" linkClassName="text-accent hover:text-white transition-colors duration-300" />
          </div>
        </div>
      </section>

      {/* ─── VIDEO SECTION ─── */}
      <div ref={videoSectionRef} className="h-[280px] sm:h-[380px] md:h-[549px] bg-bg relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-[center_20%] grayscale brightness-[0.5] contrast-[1.15] sepia-[0.15]"
        >
          <source src="/video/soldiers.mp4" type="video/mp4" />
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
          style={{ background: "linear-gradient(to bottom, var(--color-bg) 0%, var(--color-bg) 8%, rgba(10,10,11,0.6) 35%, transparent 65%)" }}
        />
        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-full z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--color-bg) 0%, var(--color-bg) 8%, rgba(10,10,11,0.6) 35%, transparent 65%)" }}
        />
        {/* Left side gradient fade */}
        <div
          className="absolute top-0 left-0 bottom-0 w-full z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to right, var(--color-bg) 0%, rgba(10,10,11,0.5) 8%, transparent 22%)" }}
        />
        {/* Right side gradient fade */}
        <div
          className="absolute top-0 right-0 bottom-0 w-full z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to left, var(--color-bg) 0%, rgba(10,10,11,0.5) 8%, transparent 22%)" }}
        />
      </div>

      {/* ─── POTENCJAŁ I OPOWIEDZIALNOŚĆ ─── */}
      <section>
        <SectionLabel label="//03 POTENCJAŁ" />
        <div className="pt-12 md:pt-16 px-[clamp(32px,5vw,64px)]">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.75rem,9.26vw,140px)] font-medium text-white leading-[1.05] tracking-[-0.5px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            POTENCJAŁ I OPOWIEDZIALNOŚĆ
          </TypewriterTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 pb-0 md:gap-16 md:mt-16 md:pb-4">
            <div>
              <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px]">
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
      <section>
        <SectionLabel label="//04 DYSTRYBUCJA" />
        <ClientSegmentsGrid segments={filary} plain />
      </section>

      {/* ─── MAP SECTION ─── */}
      <section>
        <div className="h-[300px] sm:h-[400px] md:h-[542px] bg-[#080808] relative overflow-hidden border-t border-white/[0.25]">
          <MilitaryMap />

          {/* HUD crosshair cursor */}
          <MapCrosshair />

          {/* Right info panel — solid bg box, absolutely positioned */}
          <div
            className="absolute right-0 top-0 z-[5] hidden md:flex items-center px-[clamp(24px,3vw,52px)] py-10 bg-bg border-l border-accent/20"
            style={{ width: "36%", maxWidth: "460px" }}
          >
            <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent/40" />
            <span className="absolute bottom-0 left-0 right-0 h-px bg-accent/20" />
            <div>
              <h3 className="text-white text-[22px] md:text-[28px] font-medium leading-[1.25] md:leading-[34px] mb-6">
                HYDRA ARMS SP. Z O.O.
              </h3>

              <div className="font-[var(--font-mono)] text-[16px] tracking-[0.8px] leading-[24px] text-text-dim space-y-0">
                <p>[<span className="text-accent">→</span>]  Kraków, Polska</p>
                <p>[<span className="text-accent">→</span>]  50°04&apos;N  019°57&apos;E</p>
                <p>[<span className="text-accent">→</span>]  Droga krajowa S7</p>
                <p>[<span className="text-accent">→</span>]  Trasa północ–południe</p>
                <p>[<span className="text-accent">→</span>]  Punkt handlowo-biurowy</p>
              </div>

              <div className="mt-8">
                <CornerCTA
                  href="https://maps.google.com/?q=50.06,19.94"
                  label="Wyznacz Trasę →"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </div>
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
        <div className="relative px-6 py-1.5 inline-flex items-center w-fit mt-4">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
          <a
            href="https://maps.google.com/?q=50.06,19.94"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[var(--font-mono)] text-[13px] text-accent tracking-[0.5px] hover:text-white transition-colors duration-300"
          >
            Wyznacz Trasę →
          </a>
        </div>
      </div>

      {/* ─── KONTAKT — TERMINAL ─── */}
      <section className="border-t border-white/[0.25] px-[clamp(32px,5vw,64px)] py-20 md:py-16">
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

                  <div className="hidden md:block">
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mt-6 mb-3">
                      $ hydra --status
                    </div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/30 leading-[2]">
                      <div>SZYFROWANIE: <span className="text-accent/60">AES-256</span></div>
                      <div>PROTOKÓŁ:    <span className="text-accent/60">TLS 1.3</span></div>
                      <div>STATUS:      <span className="text-accent">AKTYWNY</span> <span className="terminal-blink">█</span></div>
                    </div>
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
                      <label className="mt-0.5 shrink-0 w-3.5 h-3.5 relative cursor-pointer block">
                        <input type="checkbox" className="sr-only peer" />
                        <span className="absolute inset-0 border border-accent/50 peer-checked:border-accent transition-colors duration-150" />
                        <span className="absolute inset-[3px] bg-accent scale-0 peer-checked:scale-100 transition-transform duration-150" />
                      </label>
                      <span className="font-[var(--font-mono)] text-[11px] text-accent/30 leading-[1.6]">
                        Wyrażam zgodę na przetwarzanie danych przez HYDRA ARMS
                        w celu inicjacji procedury kontaktowej. Akceptuję{" "}
                        <a href="/polityka-prywatnosci" className="text-accent/60 hover:text-accent transition-colors">
                          Politykę Prywatności
                        </a>.
                      </span>
                    </div>
                    <div className="flex justify-end pt-2">
                      <div className="relative px-6 py-1.5 inline-flex items-center w-fit">
                        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                        <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                        <button
                          type="submit"
                          className="font-[var(--font-mono)] text-[13px] tracking-[1px] text-accent hover:text-white transition-colors duration-300"
                        >
                          WYŚLIJ
                        </button>
                      </div>
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
