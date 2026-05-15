"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import AnimateIn from "@/components/AnimateIn";
import TypewriterTitle from "@/components/TypewriterTitle";
import DrawReveal from "@/components/DrawReveal";
import MissionBriefing from "@/components/MissionBriefing";
import SubpageHero from "@/components/SubpageHero";
import TacticalGrid from "@/components/TacticalGrid";
import CornerCTA from "@/components/ui/CornerCTA";
import IntroBlock from "@/components/sections/IntroBlock";

/* ──────────── DEFAULTS ──────────── */

type FundamentItem = { id: string; title: string; desc: string }
type KorzyscTab = { id: string; label: string; title: string; desc: string }
type EthicsItem = { title: string; desc: string }

const DEFAULT_FUNDAMENTY: FundamentItem[] = [
  { id: "01", title: "Interdyscyplinarne badania i rozwój", desc: "Nasze projekty badawcze łączą wiele dziedzin nauki." },
  { id: "02", title: "Transparentność operacyjna", desc: "Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli obrotu specjalnego." },
  { id: "03", title: "Nowoczesne materiały", desc: "Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji." },
  { id: "04", title: "Inżynieria precyzyjna", desc: "Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań produkcyjnych i prototypowych." },
  { id: "05", title: "Wszechstronność projektowa", desc: "Tworzymy koncepcje dla różnych rodzajów uzbrojenia." },
];

const DEFAULT_KORZYSCI_TABS: KorzyscTab[] = [
  { id: "suwer", label: "Suwerenność technologiczna", title: "Suwerenność technologiczna", desc: "Rozwijanie krajowych kompetencji w zakresie wytwarzania kluczowych komponentów uzbrojenia i amunicji, redukujące zależność od zewnętrznych łańcuchów dostaw." },
  { id: "optym", label: "Optymalizacja kosztów", title: "Optymalizacja kosztów", desc: "Efektywne zarządzanie procesami produkcyjnymi pozwalające na redukcję kosztów przy zachowaniu najwyższych standardów jakości i bezpieczeństwa." },
  { id: "adapt", label: "Szybka adaptacja", title: "Szybka adaptacja", desc: "Elastyczne podejście do zmieniających się wymagań operacyjnych, umożliwiające szybkie wdrażanie nowych rozwiązań technologicznych." },
  { id: "bezp", label: "Bezpieczeństwo prawne", title: "Bezpieczeństwo prawne", desc: "Pełna zgodność z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego, gwarantująca bezpieczeństwo prawne współpracy." },
];

const DEFAULT_ETHICS_ITEMS: EthicsItem[] = [
  { title: "Bezwzględna zgodność prawna", desc: "Każda transakcja i proces wytwórczy realizowane są w pełnej zgodności z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego." },
  { title: "Ochrona informacji", desc: "Zobowiązujemy się do najwyższych standardów poufności na każdym etapie współpracy — od ofertowania po dostawy." },
  { title: "Inżynieryjna rzetelność", desc: "Jako partner strategiczny, zobowiązujemy się do transparentności procesów badawczo-wytwórczych oraz ochrony interesu bezpieczeństwa państwa na każdym etapie cyklu życia produktu." },
];

const DEFAULT_INTRO_TEXT = "Jesteśmy interdyscyplinarnym ośrodkiem inżynieryjnym specjalizującym się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego i służb porządku publicznego.";
const DEFAULT_SECOND_TEXT = "Swoje usługi kierujemy do szerokiego spektrum odbiorców — od jednostek wojskowych i policyjnych, przez instytucje badawcze, aż po partnerów przemysłowych w modelu B2B. Każda relacja opiera się na dyskrecji, profesjonalizmie i dążeniu do doskonałości technicznej.";

interface WspolpracaPageClientProps {
  introText?: string
  secondText?: string
  fundamenty?: FundamentItem[]
  korzysciTabs?: KorzyscTab[]
  ethicsItems?: EthicsItem[]
}

/* ──────────── PAGE ──────────── */

export default function WspolpracaPageClient({
  introText = DEFAULT_INTRO_TEXT,
  secondText = DEFAULT_SECOND_TEXT,
  fundamenty = DEFAULT_FUNDAMENTY,
  korzysciTabs = DEFAULT_KORZYSCI_TABS,
  ethicsItems = DEFAULT_ETHICS_ITEMS,
}: WspolpracaPageClientProps = {}) {
  const [activeTab, setActiveTab] = useState(korzysciTabs[0]?.id ?? "suwer");
  const [fundPage, setFundPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const activeIndex = korzysciTabs.findIndex((t) => t.id === activeTab);
  const fundMaxPage = Math.ceil(fundamenty.length / 2) - 1;

  const contentRef = useRef<HTMLDivElement>(null);
  const fundRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setFundPage((p) => (p >= fundMaxPage ? 0 : p + 1));
    }, 3500);
  };

  useEffect(() => {
    if (!isHovered) resetAutoPlay();
    else if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, fundMaxPage]);

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [activeTab]);

  useEffect(() => {
    if (!fundRef.current) return;
    gsap.fromTo(
      fundRef.current.children,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }
    );
  }, [fundPage]);

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / Współpraca" title="Współpraca" video="/video/hero-wspolpraca.mp4" />

      {/* ─── INTRO SECTION ─── */}
      <IntroBlock
        text={introText}
        ctaHref="#"
        ctaLabel="Rozpocznij współpracę"
      />

      {/* ─── FUNDAMENTY SECTION ─── */}
      <section className="border-t border-white/5">
        <div className="flex items-start md:items-end justify-between px-[clamp(32px,5vw,64px)] pt-10 md:pt-16 pb-6 md:pb-8 gap-4">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px]"
            speed={50}
          >
            Fundamenty naszej działalności
          </TypewriterTitle>

          <div className="flex gap-3 shrink-0 ml-8">
            <button
              onClick={() => { setFundPage((p) => p - 1); resetAutoPlay(); }}
              disabled={fundPage === 0}
              className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-colors duration-300 disabled:opacity-20 disabled:pointer-events-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8L10 13" /></svg>
            </button>
            <button
              onClick={() => { setFundPage((p) => p + 1); resetAutoPlay(); }}
              disabled={fundPage >= fundMaxPage}
              className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-colors duration-300 disabled:opacity-20 disabled:pointer-events-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3L11 8L6 13" /></svg>
            </button>
          </div>
        </div>

        <div
          ref={fundRef}
          className="grid grid-cols-1 md:grid-cols-2 md:min-h-[320px] border-t border-b border-white/5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {[0, 1].map((offset) => {
            const item = fundamenty[fundPage * 2 + offset];
            if (!item) return <div key={offset} />;
            return (
              <div
                key={item.id}
                className={`flex flex-col px-[clamp(32px,5vw,64px)] py-[clamp(16px,3vw,40px)] ${
                  offset === 0 ? "md:border-r border-white/5 border-b md:border-b-0" : ""
                }`}
              >
                <p className="text-[clamp(1.25rem,2vw,30px)] font-normal text-text-dim leading-[1.4] tracking-[-0.2px] text-justify">
                  {item.desc}
                </p>

                <div className="mt-auto flex items-start gap-4 pt-6">
                  <span className="w-6 h-px bg-text-dim/40 mt-2.5 shrink-0" />
                  <div>
                    <span className="font-[var(--font-mono)] text-accent text-[14px] tracking-[1px]">
                      {item.id}
                    </span>
                    <h3 className="text-text-dim text-[16px] font-medium leading-[22px] mt-1">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* ─── TACTICAL GRID BREAK ─── */}
      <div className="h-[280px] sm:h-[380px] md:h-[549px] bg-[#060806] relative overflow-hidden">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale brightness-[0.6] z-0"
        >
          <source src="/video/aerial-view.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 z-[1]">
          <TacticalGrid />
        </div>
        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(6,8,6,0.85) 100%)" }}
        />
        {/* Top + bottom fade */}
        <div
          className="absolute top-0 left-0 right-0 h-full pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--color-bg) 0%, transparent 15%, transparent 85%, var(--color-bg) 100%)" }}
        />
      </div>

      {/* ─── SECOND DESCRIPTION ─── */}
      <IntroBlock
        text={secondText}
        ctaHref="#"
        ctaLabel="Rozpocznij współpracę"
        py="py-16 md:py-28"
      />

      {/* ─── PARTNERSTWA STRATEGICZNE ─── */}
      <section className="border-t border-b border-white/5">
        <div className="px-[clamp(32px,5vw,64px)] pt-16">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.75rem,9.26vw,140px)] font-medium text-white leading-[1.05] tracking-[-0.5px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            PARTNERSTWA STRATEGICZNE
          </TypewriterTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pb-8 md:gap-16 md:mt-16 md:pb-16">
            <div>
              <AnimateIn delay={0.1}>
                <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] text-justify">
                  Nasza wizja współpracy z sektorem publicznym i służbami mundurowymi
                  opiera się na dostarczaniu rozwiązań wyprzedzających współczesne
                  wyzwania operacyjne. Poprzez integrację kompetencji R&D z potrzebami
                  jednostek liniowych, tworzymy fundament pod długofalowe programy
                  modernizacyjne.
                </p>
              </AnimateIn>
            </div>
            <div className="hidden md:flex items-start justify-end">
              <a href="#" className="w-[100px] h-[100px] border border-white/10 flex items-center justify-center hover:border-accent/40 transition-colors duration-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-dim">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </a>
            </div>
          </div>
        </div>

      </section>

      {/* ─── KLUCZOWE KORZYŚCI ─── */}
      <section>
        <div className="px-[clamp(32px,5vw,64px)] pt-10 md:pt-16 pb-8 md:pb-16 text-center">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.75rem,4.76vw,72px)] font-medium text-white leading-[1.1] md:leading-[76px] tracking-[-1.44px]"
            speed={55}
          >
            Kluczowe korzyści
          </TypewriterTitle>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 sm:gap-6 px-[clamp(32px,5vw,64px)] py-3.5 border-b border-white/10 overflow-x-auto scrollbar-hide">
          {korzysciTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-[var(--font-mono)] text-[12px] sm:text-[14px] tracking-[1.12px] transition-colors duration-300 whitespace-nowrap shrink-0 ${
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
          <div ref={contentRef} className="px-[clamp(32px,5vw,80px)] pt-10 pb-16">
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

            <h3 className="text-white text-[clamp(1.5rem,3.17vw,48px)] font-normal leading-[1.15] md:leading-[53px] tracking-[-0.48px] mb-6 max-w-[600px]">
              {korzysciTabs.find((t) => t.id === activeTab)?.title}
            </h3>
            <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] max-w-[750px] text-justify">
              {korzysciTabs.find((t) => t.id === activeTab)?.desc}
            </p>

            <div className="flex justify-end mt-8 md:mt-16">
              <CornerCTA href="#" label="Napisz do nas" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── ETHICS SECTION ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Left */}
        <div className="px-[clamp(32px,5vw,64px)] pt-20 pb-8 md:pb-16 flex flex-col h-full border-b md:border-b-0">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px]"
            speed={45}
          >
            Kodeks etyki w partnerstwie strategicznym
          </TypewriterTitle>
          <div className="mt-6 md:mt-auto">
            <MissionBriefing />
          </div>
        </div>

        {/* Right */}
        <div className="pt-10 md:pt-16 pb-16 px-[clamp(32px,5vw,64px)]">
          <div className="flex flex-col gap-9">
            {ethicsItems.map((item, i) => (
              <DrawReveal
                key={i}
                title={item.title}
                desc={item.desc}
                delay={i * 0.2}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
