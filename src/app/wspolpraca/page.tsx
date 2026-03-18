"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimateIn from "@/components/AnimateIn";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import TypewriterTitle from "@/components/TypewriterTitle";

gsap.registerPlugin(ScrollTrigger);

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

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });

    tl.fromTo(
      overlayRef.current,
      { opacity: 1 },
      { opacity: 0, duration: 1.2, ease: "power2.out" }
    );

  }, []);

  return (
    <main>
      {/* ─── HERO ─── */}
      <section className="relative h-[70vh] overflow-hidden bg-bg border-b border-white/10">
        {/* Black flash overlay for entrance */}
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[15] pointer-events-none"
        />

        {/* Video background — scaled up and repositioned so center action sits at bottom-left */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-[200%] h-[200%] object-cover z-[1]"
          style={{ bottom: "-60%", left: "-20%", right: "auto", top: "auto" }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Text cutout effect */}
        <div className="absolute inset-0 z-[2] bg-black mix-blend-multiply flex flex-col justify-end px-16 pb-6">
          <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-2.5">
            HYDRA ARMS / WSPÓŁPRACA
          </span>
          <TypewriterTitle
            as="h1"
            className="text-[clamp(4rem,12vw,200px)] font-bold text-white leading-none tracking-[-3px] uppercase"
            speed={70}
            delay={800}
          >
            WSPÓŁPRACA
          </TypewriterTitle>
        </div>

      </section>

      {/* ─── INTRO SECTION ─── */}
      <section className="py-32 px-16">
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
        <div className="px-16 border-t border-white/5">
          <div className="flex items-end justify-between pt-4 pb-8">
            <TypewriterTitle
              as="h2"
              className="text-[clamp(1.5rem,3.17vw,48px)] font-light text-text leading-[53px] tracking-[-0.48px]"
              speed={50}
            >
              Fundamenty naszej działalności
            </TypewriterTitle>
            <AnimateIn delay={0.2} className="hidden md:flex gap-9 items-center">
              <button className="text-text-dim hover:text-accent transition-colors" aria-label="Previous">
                <svg width="18" height="36" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 6L4 18L14 30" />
                </svg>
              </button>
              <button className="text-text-dim hover:text-accent transition-colors" aria-label="Next">
                <svg width="18" height="36" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6L14 18L4 30" />
                </svg>
              </button>
            </AnimateIn>
          </div>
        </div>

        <div className="px-16 border-t border-white/5">
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
      <section className="py-28 px-16">
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
      <section className="relative grid grid-cols-1 md:grid-cols-2 min-h-[578px] overflow-hidden">
        {/* Left content */}
        <div className="px-16 py-16 flex flex-col justify-center">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px] mb-8"
            speed={45}
          >
            Partnerstwa strategiczne
          </TypewriterTitle>
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
            [ Napisz do nas ]
          </ScrambleLink>
        </div>
        {/* Right atmospheric image placeholder */}
        <div className="relative min-h-[300px] md:min-h-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#061106] via-[#0a120a] to-[#050505]" />
        </div>
      </section>

      {/* ─── KLUCZOWE KORZYŚCI ─── */}
      <section>
        <div className="px-16 pt-16 pb-16 text-center">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,4.76vw,72px)] font-normal text-white leading-[76px] tracking-[-1.44px]"
            speed={55}
          >
            Kluczowe korzyści
          </TypewriterTitle>
        </div>

        {/* Tabs */}
        <AnimateIn delay={0.1}>
          <div className="flex flex-wrap gap-4 px-16 border-b border-white/10">
            {korzysciTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[18px] font-medium leading-[23px] pb-3.5 transition-all duration-300 relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-text"
                    : "text-text-dim hover:text-text"
                }`}
              >
                [ {tab.label} ]
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-[75px] h-0.5 bg-accent" />
                )}
              </button>
            ))}
          </div>
        </AnimateIn>

        {/* Content */}
        <AnimateIn delay={0.15}>
          <div className="px-20 pt-10 pb-8 border-b border-white/10">
            <div className="border border-white/15 inline-block px-3 py-1.5 mb-8">
              <span className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                <span className="text-accent">
                  {String(activeIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-text-dim">
                  /{String(korzysciTabs.length).padStart(2, "0")}
                </span>
              </span>
            </div>

            <div key={activeTab} className="animate-fadeIn">
              <h3 className="text-white text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] mb-6 max-w-[600px]">
                {korzysciContent[activeTab].title}
              </h3>
              <p className="text-text-dim text-[18px] font-normal leading-[30px] max-w-[750px]">
                {korzysciContent[activeTab].desc}
              </p>
            </div>

            <div className="flex justify-end mt-16">
              <ScrambleLink
                href="/kontakt"
                className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] border border-accent/40 px-6 py-2 hover:bg-accent hover:text-bg transition-all duration-300"
              >
                [ Napisz do nas ]
              </ScrambleLink>
            </div>
          </div>
        </AnimateIn>
      </section>

      {/* ─── ETHICS SECTION ─── */}
      <section className="relative overflow-hidden bg-bg-light">
        <div className="moving-grain" />
        <div className="relative z-[1] grid grid-cols-1 md:grid-cols-2 min-h-[634px]">
          {/* Left - Title */}
          <div className="px-16 pt-9">
            <TypewriterTitle
              as="h2"
              className="text-text text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px]"
              speed={45}
            >
              Kodeks etyki w partnerstwie strategicznym
            </TypewriterTitle>
          </div>

          {/* Right - Items */}
          <div className="px-16 pt-16">
            {ethicsItems.map((item, i) => (
              <AnimateIn key={i} delay={i * 0.1} y={20}>
                <div className={`pb-9 ${i > 0 ? "pt-9" : ""}`}>
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
        </div>
      </section>
    </main>
  );
}
