"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import AnimateIn from "@/components/AnimateIn";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import Image from "next/image";
import SubpageHero from "@/components/SubpageHero";

/* ──────────── DATA ──────────── */

const competencies = [
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

/* ──────────── PAGE ──────────── */

export default function UslugiPage() {
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
      <section className="py-32 px-[clamp(24px,4vw,64px)] border-b border-white/10">
        <ScrollRevealText
          text="W HYDRA ARMS proces twórczy zaczyna się od precyzyjnej definicji potrzeb operacyjnych. Nasz zespół inżynierski, wspierany przez praktyków z sektora obronnego, projektuje systemy uzbrojenia i komponenty zorientowane na ekstremalną trwałość i niezawodność."
          className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <ScrambleLink href="/kontakt" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
            [ Zapytaj o wycenę ]
          </ScrambleLink>
        </div>
      </section>

      {/* ─── NASZE KOMPETENCJE ─── */}
      <section className="border-b border-white/10">
        {/* Title */}
        <div className="flex items-center justify-center pt-16 pb-32 px-[clamp(24px,4vw,64px)]">
          <h2 className="text-[clamp(2.5rem,4.76vw,72px)] font-normal text-text leading-[76px] tracking-[-1.44px]">
            Nasze kompetencje
          </h2>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-6 px-[clamp(24px,4vw,64px)] py-3.5 border-b border-white/10">
          {competencies.map((comp, i) => (
            <button
              key={comp.id}
              onClick={() => setActiveTab(i)}
              className={`draw-line-hover font-[var(--font-mono)] text-[14px] tracking-[1.12px] transition-colors duration-300 ${
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
        <div className="border-b border-white/10">
          <div ref={contentRef} className="px-[clamp(24px,4vw,80px)] pt-10 pb-32">
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
            <h3 className="text-[clamp(2rem,3.17vw,48px)] font-light text-text leading-[53px] tracking-[-0.48px] mb-6">
              {active.title}
            </h3>
            <p className="text-[18px] font-light text-text-dim leading-[23px] max-w-[749px] mb-8">
              {active.desc}
            </p>

            {/* Tags */}
            <div className="flex gap-2.5 items-center py-2.5 flex-wrap mb-8">
              {active.tags.map((tag, ti) => (
                <span key={ti} className="flex items-center gap-2.5">
                  <span className="font-[var(--font-mono)] text-[20px] text-accent tracking-[0.2px]">
                    {tag}
                  </span>
                  <span className="w-[5px] h-[5px] bg-[#d9d9d9]" />
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex justify-end">
              <ScrambleLink href="/kontakt" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                {`[ ${active.cta} ]`}
              </ScrambleLink>
            </div>
          </div>
        </div>

        {/* Full-width image */}
        <div className="relative h-[680px] overflow-hidden">
          <Image
            src={active.img}
            alt={active.title}
            fill
            className="object-cover grayscale brightness-[0.25] contrast-[1.1] sepia-[0.15] transition-all duration-700"
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
          {/* Top + bottom gradients */}
          <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-bg via-bg/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        </div>
      </section>

      {/* ─── WSPÓŁPRACA CTA ─── */}
      <section className="border-b border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">
          {/* Left label */}
          <div className="border-r border-white/10 px-12 py-16 flex items-start">
            <AnimateIn>
              <span className="font-[var(--font-mono)] text-[16px] font-medium text-text tracking-[0.8px]">
                Współpraca
              </span>
            </AnimateIn>
          </div>

          {/* Right content */}
          <div className="px-[clamp(24px,4vw,80px)] py-16 flex flex-col gap-9">
            <AnimateIn delay={0.1}>
              <p className="text-[clamp(2rem,3.17vw,48px)] font-light text-text-dim leading-[53px] tracking-[-0.48px]">
                Dostarczamy rozwiązania tam, gdzie standardowe metody zawodzą.
              </p>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                [ Rozpocznij współpracę ]
              </ScrambleLink>
            </AnimateIn>
          </div>
        </div>
      </section>
    </main>
  );
}
