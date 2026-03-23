"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import AnimateIn from "@/components/AnimateIn";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import TypewriterTitle from "@/components/TypewriterTitle";
import SubpageHero from "@/components/SubpageHero";

/* ──────────── DATA ──────────── */

const fundamenty = [
  {
    id: "01",
    title: "Interdyscyplinarne badania i rozwój",
    desc: "Nasze projekty badawcze łączą wiele dziedzin nauki.",
  },
  {
    id: "02",
    title: "Wszechstronność projektowa",
    desc: "Tworzymy koncepcje dla różnych rodzajów uzbrojenia.",
  },
  {
    id: "03",
    title: "Nowoczesne materiały",
    desc: "Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji.",
  },
];

const korzysciTabs = [
  { label: "Suwerenność technologiczna", id: "suwer" },
  { label: "Optymalizacja kosztów", id: "optym" },
  { label: "Szybka adaptacja", id: "adapt" },
  { label: "Bezpieczeństwo prawne", id: "bezp" },
];

const korzysciContent: Record<string, { title: string; desc: string }> = {
  suwer: {
    title: "Suwerenność technologiczna",
    desc: "Rozwijanie krajowych kompetencji w zakresie wytwarzania kluczowych komponentów uzbrojenia i amunicji, redukujące zależność od zewnętrznych łańcuchów dostaw.",
  },
  optym: {
    title: "Optymalizacja kosztów",
    desc: "Efektywne zarządzanie procesami produkcyjnymi pozwalające na redukcję kosztów przy zachowaniu najwyższych standardów jakości i bezpieczeństwa.",
  },
  adapt: {
    title: "Szybka adaptacja",
    desc: "Elastyczne podejście do zmieniających się wymagań operacyjnych, umożliwiające szybkie wdrażanie nowych rozwiązań technologicznych.",
  },
  bezp: {
    title: "Bezpieczeństwo prawne",
    desc: "Pełna zgodność z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego, gwarantująca bezpieczeństwo prawne współpracy.",
  },
};

const ethicsItems = [
  {
    title: "Bezwzględna zgodność prawna",
    desc: "Każda transakcja i proces wytwórczy realizowane są w pełnej zgodności z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego.",
  },
  {
    title: "Ochrona informacji",
    desc: "Zobowiązujemy się do najwyższych standardów poufności na każdym etapie współpracy — od ofertowania po dostawy.",
  },
  {
    title: "Inżynieryjna rzetelność",
    desc: "Jako partner strategiczny, zobowiązujemy się do transparentności procesów badawczo-wytwórczych oraz ochrony interesu bezpieczeństwa państwa na każdym etapie cyklu życia produktu.",
  },
];

/* ──────────── PAGE ──────────── */

export default function WspolpracaPage() {
  const [activeTab, setActiveTab] = useState("suwer");
  const activeIndex = korzysciTabs.findIndex((t) => t.id === activeTab);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [activeTab]);

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / Współpraca" title="Współpraca" video="/hero-wspolpraca.mp4" />

      {/* ─── INTRO SECTION ─── */}
      <section className="py-32 px-[clamp(24px,4vw,64px)]">
        <ScrollRevealText
          text="Jesteśmy interdyscyplinarnym ośrodkiem inżynieryjnym specjalizującym się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego i służb porządku publicznego."
          className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <ScrambleLink
            href="/kontakt"
            className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
          >
            [ Rozpocznij współpracę ]
          </ScrambleLink>
        </div>
      </section>

      {/* ─── FUNDAMENTY SECTION ─── */}
      <section>
        <div className="px-[clamp(24px,4vw,64px)] border-t border-white/5">
          <div className="flex items-end justify-between pt-4 pb-8">
            <TypewriterTitle
              as="h2"
              className="text-[clamp(1.5rem,3.17vw,48px)] font-light text-text leading-[53px] tracking-[-0.48px]"
              speed={50}
            >
              Fundamenty naszej działalności
            </TypewriterTitle>
            <AnimateIn delay={0.2} className="hidden md:flex gap-9 items-center">
              <button className="draw-line-hover text-text-dim hover:text-accent transition-colors" aria-label="Previous">
                <svg width="18" height="36" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 6L4 18L14 30" />
                </svg>
              </button>
              <button className="draw-line-hover text-text-dim hover:text-accent transition-colors" aria-label="Next">
                <svg width="18" height="36" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6L14 18L4 30" />
                </svg>
              </button>
            </AnimateIn>
          </div>
        </div>

        <div className="px-[clamp(24px,4vw,64px)] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {fundamenty.map((item, i) => (
              <AnimateIn key={item.id} delay={i * 0.1} y={20}>
                <div className={`relative py-8 px-4 ${i < fundamenty.length - 1 ? "md:border-r md:border-white/5" : ""}`}>
                  <span className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] block mb-5">
                    <span className="text-text text-2xl">[</span>
                    <span className="text-accent">{item.id}</span>
                    <span className="text-text text-2xl">]</span>
                  </span>
                  <h3 className="text-text text-[28px] font-medium leading-[34px] mb-5">
                    {item.title}
                  </h3>
                  <p className="text-text-dim text-[16px] font-normal leading-[26px]">
                    {item.desc}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── IMAGE SECTION ─── */}
      <div className="h-[549px] bg-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#080808] opacity-80" />
      </div>

      {/* ─── SECOND DESCRIPTION ─── */}
      <section className="py-28 px-[clamp(24px,4vw,64px)]">
        <ScrollRevealText
          text="Swoje usługi kierujemy do szerokiego spektrum odbiorców — od jednostek wojskowych i policyjnych, przez instytucje badawcze, aż po partnerów przemysłowych w modelu B2B. Każda relacja opiera się na dyskrecji, profesjonalizmie i dążeniu do doskonałości technicznej."
          className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <ScrambleLink
            href="/kontakt"
            className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
          >
            [ Rozpocznij współpracę ]
          </ScrambleLink>
        </div>
      </section>

      {/* ─── PARTNERSTWA STRATEGICZNE ─── */}
      <section className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] min-h-[578px] overflow-hidden border-t border-white/5">
        {/* Left content */}
        <div className="px-[clamp(24px,4vw,64px)] py-16 flex flex-col justify-center">
          <AnimateIn delay={0.1}>
            <p className="text-text-dim text-[16px] font-normal leading-[26px] mb-10 max-w-[500px]">
              Nasza wizja współpracy z sektorem publicznym i służbami mundurowymi
              opiera się na dostarczaniu rozwiązań wyprzedzających współczesne
              wyzwania operacyjne. Poprzez integrację kompetencji R&D z potrzebami
              jednostek liniowych, tworzymy fundament pod długofalowe programy
              modernizacyjne, które gwarantują przewagę technologiczną, niezależność
              sprzętową oraz najwyższy poziom ochrony funkcjonariuszy i żołnierzy.
            </p>
          </AnimateIn>
          <ScrambleLink
            href="/kontakt"
            className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
          >
            [ Rozpocznij współpracę ]
          </ScrambleLink>
        </div>
        {/* Center vertical label */}
        <div className="hidden md:flex items-center justify-center border-x border-white/5 px-4">
          <span
            className="font-[var(--font-mono)] text-[14px] text-accent/60 tracking-[0.2em] uppercase whitespace-nowrap"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Partnerstwa strategiczne
          </span>
        </div>
        {/* Right atmospheric image */}
        <div className="relative min-h-[300px] md:min-h-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#061106] via-[#0a120a] to-[#050505]" />
          <div className="absolute inset-0 opacity-[0.15] bg-[url('/hero-video-poster.jpg')] bg-cover bg-center grayscale" />
        </div>
      </section>

      {/* ─── KLUCZOWE KORZYŚCI ─── */}
      <section>
        <div className="px-[clamp(24px,4vw,64px)] pt-16 pb-16 text-center">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,4.76vw,72px)] font-normal text-white leading-[76px] tracking-[-1.44px]"
            speed={55}
          >
            Kluczowe korzyści
          </TypewriterTitle>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-6 px-[clamp(24px,4vw,64px)] py-3.5 border-b border-white/10">
          {korzysciTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`draw-line-hover font-[var(--font-mono)] text-[14px] tracking-[1.12px] transition-colors duration-300 ${
                activeTab === tab.id
                  ? "text-text"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <span className="text-text-dim">[</span>
              <span className={activeTab === tab.id ? "text-accent" : ""}> {tab.label} </span>
              <span className="text-text-dim">]</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="border-b border-white/10">
          <div ref={contentRef} className="px-[clamp(24px,4vw,80px)] pt-10 pb-16">
            <div className="mb-9">
              <div className="border border-text/50 px-2 py-1 inline-block">
                <span className="font-[var(--font-mono)] text-[18px]">
                  <span className="text-accent">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="text-white/30">
                    /{String(korzysciTabs.length).padStart(2, "0")}
                  </span>
                </span>
              </div>
            </div>

            <h3 className="text-white text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] mb-6 max-w-[600px]">
              {korzysciContent[activeTab].title}
            </h3>
            <p className="text-text-dim text-[18px] font-normal leading-[30px] max-w-[750px]">
              {korzysciContent[activeTab].desc}
            </p>

            <div className="flex justify-end mt-16">
              <ScrambleLink
                href="/kontakt"
                className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] border border-accent/40 px-6 py-2 hover:bg-accent hover:text-bg transition-all duration-300"
              >
                [ Napisz do nas ]
              </ScrambleLink>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ETHICS SECTION ─── */}
      <section className="relative overflow-hidden bg-bg-light">
        <div className="moving-grain" />
        <div className="relative z-[1] grid grid-cols-1 md:grid-cols-[1fr_1fr_0.6fr] min-h-[634px]">
          {/* Left - Title */}
          <div className="px-[clamp(24px,4vw,64px)] pt-9">
            <TypewriterTitle
              as="h2"
              className="text-text text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px]"
              speed={45}
            >
              Kodeks etyki w partnerstwie strategicznym
            </TypewriterTitle>
          </div>

          {/* Center - Items */}
          <div className="px-[clamp(24px,4vw,64px)] pt-16">
            {ethicsItems.map((item, i) => (
              <AnimateIn key={i} delay={i * 0.1} y={20}>
                <div className={`pb-9 ${i > 0 ? "pt-9 border-t border-white/5" : ""}`}>
                  <h4 className="text-text text-[28px] font-medium leading-[34px] mb-4">
                    {item.title}
                  </h4>
                  <p className="text-text-dim text-[18px] font-normal leading-[30px] max-w-[535px]">
                    {item.desc}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Right - Atmospheric image */}
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-gradient-to-l from-[#0a0a0a] via-[#0f0f0f] to-transparent" />
            <div className="absolute inset-0 opacity-[0.2] bg-[url('/hero-video-poster.jpg')] bg-cover bg-[center_right] grayscale" />
          </div>
        </div>
      </section>
    </main>
  );
}
