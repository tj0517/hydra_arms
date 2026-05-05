"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import SubpageHero from "@/components/SubpageHero";
import TypewriterTitle from "@/components/TypewriterTitle";


/* ──────────── DATA ──────────── */

const clientSegments = [
  {
    tag: "Wojsko",
    title: "Siły Zbrojne",
    desc: "Dostarczamy uzbrojenie i wyposażenie spełniające najwyższe standardy wojskowe, testowane w warunkach operacyjnych.",
    href: "/wspolpraca",
    svg: (
      <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
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
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          return <line key={k} x1="100" y1="100"
            x2={(100 + Math.cos(a) * 78).toFixed(1)}
            y2={(100 + Math.sin(a) * 78).toFixed(1)}
            stroke="currentColor" strokeWidth="0.5" opacity="0.22" />;
        })}
      </svg>
    ),
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    svg: (
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
    ),
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    svg: (
      <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
        <ellipse cx="100" cy="58" rx="72" ry="20" stroke="currentColor" strokeWidth="1.0" opacity="0.6" />
        <line x1="28" y1="58" x2="28" y2="152" stroke="currentColor" strokeWidth="1.0" opacity="0.55" />
        <line x1="172" y1="58" x2="172" y2="152" stroke="currentColor" strokeWidth="1.0" opacity="0.55" />
        <path d="M 28,152 A 72,20 0 0 0 172,152" stroke="currentColor" strokeWidth="1.0" opacity="0.5" fill="none" />
        <ellipse cx="100" cy="58" rx="28" ry="8" stroke="currentColor" strokeWidth="0.65" opacity="0.35" />
        <ellipse cx="100" cy="102" rx="72" ry="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 4" opacity="0.22" />
      </svg>
    ),
  },
];

const DEFAULT_COMPETENCIES = [
  {
    id: "01",
    tab: "Projektowanie i R&D",
    title: "Projektowanie i badania rozwojowe",
    desc: "Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.",
    tags: ["CAD/CAM", "Analizy MES", "Inżynieria odwrotna"],
    cta: "Zapytaj o projekt",
    img: "/service-01.jpg",
  },
  {
    id: "02",
    tab: "Obróbka CNC",
    title: "Precyzyjna obróbka CNC",
    desc: "Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem wieloosiowych centrów obróbczych CNC. Tolerancje na poziomie mikrometrów, powtarzalność seryjna i pełna kontrola wymiarowa każdej partii.",
    tags: ["Frezowanie 5-osi", "Toczenie CNC", "Kontrola CMM"],
    cta: "Zapytaj o produkcję",
    img: "/service-02.jpg",
  },
  {
    id: "03",
    tab: "Druk 3D",
    title: "Druk 3D i prototypowanie",
    desc: "Wykorzystujemy technologie przyrostowe do szybkiego prototypowania i produkcji funkcjonalnych komponentów. Druk metalowy SLM oraz polimerowy FDM/SLA pozwala na iteracyjne testowanie koncepcji.",
    tags: ["SLM/DMLS", "FDM/SLA", "Rapid prototyping"],
    cta: "Zapytaj o prototyp",
    img: "/service-03.jpg",
  },
  {
    id: "04",
    tab: "Kontrola jakości",
    title: "Kontrola jakości i certyfikacja",
    desc: "Każdy wyrób przechodzi wieloetapowy proces kontroli jakości zgodny ze standardami NATO AQAP. Stosujemy zaawansowane metody pomiarowe, testy balistyczne i analizy metalurgiczne.",
    tags: ["AQAP", "Testy balistyczne", "Metrologia"],
    cta: "Zapytaj o certyfikację",
    img: "/service-04.jpg",
  },
  {
    id: "05",
    tab: "Montaż i serwis",
    title: "Montaż końcowy i serwis techniczny",
    desc: "Zapewniamy kompleksowy montaż systemów uzbrojenia, modernizację istniejących platform oraz serwis gwarancyjny i pogwarancyjny. Każda jednostka przechodzi testy funkcjonalne przed przekazaniem.",
    tags: ["Modernizacja", "Diagnostyka", "Kalibracja"],
    cta: "Zapytaj o serwis",
    img: "/service-01.jpg",
  },
];

const DEFAULT_INTRO_TEXT = "W HYDRA ARMS proces twórczy zaczyna się od precyzyjnej definicji potrzeb operacyjnych. Nasz zespół inżynierski, wspierany przez praktyków z sektora obronnego, projektuje systemy uzbrojenia i komponenty zorientowane na ekstremalną trwałość i niezawodność.";

interface UslugiPageClientProps {
  introText?: string
  competencies?: typeof DEFAULT_COMPETENCIES
}

/* ──────────── PAGE ──────────── */

export default function UslugiPageClient({
  introText = DEFAULT_INTRO_TEXT,
  competencies = DEFAULT_COMPETENCIES,
}: UslugiPageClientProps = {}) {
  const [activeTab, setActiveTab] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animate content on tab change
  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [activeTab]);

  const active = competencies[activeTab];

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / Usługi" title="Usługi" video="/hero-uslugi.mp4" />

      {/* ─── INTRO DESCRIPTION ─── */}
      <section className="py-20 md:py-32 px-[clamp(32px,5vw,64px)] border-b border-white/10">
        <ScrollRevealText
          text={introText}
          className="text-[1.4rem] md:text-[3.2vw] font-medium text-text-dim leading-[1.3] md:leading-[1.1] tracking-[-0.48px] text-justify"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <div className="relative px-6 py-1.5 inline-flex items-center w-fit">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
            <ScrambleLink href="#" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
              Zapytaj o wycenę
            </ScrambleLink>
          </div>
        </div>
      </section>

      {/* ─── NASZE KOMPETENCJE ─── */}
      <section className="border-b border-white/10">
        {/* Title */}
        <div className="flex items-center justify-center py-10 md:py-20 px-[clamp(32px,5vw,64px)]">
          <h2 className="text-[clamp(1.75rem,4.76vw,72px)] font-medium text-white leading-[1.1] md:leading-[76px] tracking-[-1.44px]">
            Nasze kompetencje
          </h2>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-4 sm:gap-6 px-[clamp(32px,5vw,64px)] py-3.5 border-b border-white/10 overflow-x-auto scrollbar-hide">
          {competencies.map((comp, i) => (
            <button
              key={comp.id}
              onClick={() => setActiveTab(i)}
              className={`font-[var(--font-mono)] text-[12px] sm:text-[14px] tracking-[1.12px] transition-colors duration-300 whitespace-nowrap shrink-0 ${
                activeTab === i
                  ? "text-text"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <span className="text-text-dim">[</span>
              <span className={activeTab === i ? "text-accent" : ""}> {comp.tab} </span>
              <span className="text-text-dim">]</span>
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div>
          <div ref={contentRef} className="px-[clamp(32px,5vw,80px)] pt-10 pb-2 relative z-10">
            {/* Counter */}
            <div className="mb-9">
              <div className="border border-text/50 px-2 py-1 inline-block">
                <span className="font-[var(--font-mono)] text-[18px]">
                  <span className="text-accent">{active.id}</span>
                  <span className="text-white/30">/{String(competencies.length).padStart(2, "0")}</span>
                </span>
              </div>
            </div>

            {/* Title + description */}
            <h3 className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px] mb-6">
              {active.title}
            </h3>
            <p className="text-[15px] md:text-[18px] font-light text-text-dim leading-[1.7] md:leading-[23px] max-w-[749px] mb-8 text-justify">
              {active.desc}
            </p>

            {/* Tags */}
            <div className="flex gap-2.5 items-center py-2.5 flex-wrap mb-8">
              {active.tags.map((tag, ti) => (
                <span key={ti} className="flex items-center gap-2.5">
                  <span className="font-[var(--font-mono)] text-[13px] md:text-[20px] text-accent/70 md:text-accent tracking-[0.2px]">
                    {tag}
                  </span>
                  <span className="w-[4px] h-[4px] md:w-[5px] md:h-[5px] bg-[#d9d9d9]/50 md:bg-[#d9d9d9]" />
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex justify-end">
              <div className="relative px-6 py-1.5 inline-flex items-center w-fit">
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                <ScrambleLink href="#" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                  {active.cta}
                </ScrambleLink>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width video */}
        <div className="relative h-[300px] sm:h-[460px] md:h-[680px] overflow-hidden -mt-16">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.35] contrast-[1.1] sepia-[0.15]"
          >
            <source src="/dark-terrain.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#0a1a0a]/40 mix-blend-multiply z-[1]" />
          <div className="moving-grain !opacity-[0.08] z-[1]" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04] z-[1]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(19,255,21,0.12) 2px, rgba(19,255,21,0.12) 4px)",
            }}
          />
          {/* Top + bottom gradients */}
          <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-bg via-bg/60 to-transparent z-[4]" />
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-bg via-bg/60 to-transparent z-[4]" />
        </div>
      </section>

      {/* ─── DLA KOGO PRACUJEMY ─── */}
      <section className="border-b border-white/10">
        {/* Section label inline with top border */}
        <div className="border-t border-white/[0.25] px-[clamp(32px,5vw,64px)] py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //05 KLIENCI
          </span>
        </div>

        {/* Title + description */}
        <div className="pt-8 md:pt-16 px-[clamp(32px,5vw,64px)]">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.75rem,9.26vw,140px)] font-medium text-white leading-[1.05] tracking-[-0.5px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            Dla kogo pracujemy
          </TypewriterTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pb-8 md:gap-16 md:mt-16 md:pb-16">
            <div>
              <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] text-justify">
                Swoje usługi kierujemy do szerokiego spektrum odbiorców — od jednostek wojskowych i policyjnych,
                przez instytucje badawcze, aż po partnerów przemysłowych w modelu B2B.
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

        {/* 3-card grid */}
        <div className="border-t border-white/[0.08]" />
        <div className="mx-[clamp(32px,5vw,64px)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 h-auto md:h-[680px]">
          {clientSegments.map((seg, i) => (
            <div key={seg.tag} className={`${i < clientSegments.length - 1 ? "md:border-r" : ""} border-b border-white/[0.08] flex flex-col justify-between py-8 md:px-10 md:py-12`}>
              <div className="hidden md:flex flex-1 items-center justify-center">
                {seg.svg}
              </div>
              <div>
                <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">
                  {seg.tag}
                </div>
                <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">
                  {seg.title}
                </h3>
                <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8 text-justify">
                  {seg.desc}
                </p>
                <div className="relative px-6 py-1.5 inline-flex items-center w-fit">
                  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                  <ScrambleLink href={seg.href} className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                    Dowiedz się więcej
                  </ScrambleLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WSPÓŁPRACA CTA ─── */}
      <section className="border-b border-white/10 py-20 md:py-32 px-[clamp(32px,5vw,64px)]">
        <ScrollRevealText
          text="Dostarczamy rozwiązania tam, gdzie standardowe metody zawodzą. Szukasz partnera technologicznego do projektu obronnego lub cywilnego?"
          className="text-[1.4rem] md:text-[3.2vw] font-medium text-text-dim leading-[1.3] md:leading-[1.1] tracking-[-0.48px] text-justify"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <div className="relative px-6 py-1.5 inline-flex items-center w-fit">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
            <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
              Rozpocznij współpracę
            </ScrambleLink>
          </div>
        </div>
      </section>
    </main>
  );
}
