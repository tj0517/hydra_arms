"use client";

import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import TypewriterTitle from "@/components/TypewriterTitle";
import DrawReveal from "@/components/DrawReveal";
import AsciiHelicopter from "@/components/AsciiHelicopter";

import DrawCard from "@/components/DrawCard";
import SubpageHero from "@/components/SubpageHero";
import TacticalReadout from "@/components/TacticalReadout";


/* ──────────── DATA ──────────── */

const missionItems = [
  {
    title: "Wytwarzanie i R&D",
    desc: "Projektujemy autorskie rozwiązania, kładąc nacisk na precyzję wykonania i niezawodność mechanizmów.",
  },
  {
    title: "Obrót uzbrojeniem",
    desc: "Prowadzimy działalność handlową w zakresie materiałów wybuchowych, broni, amunicji oraz wyrobów i technologii o przeznaczeniu wojskowym lub policyjnym — operując zarówno na rynku cywilnym, jak i specjalnym.",
  },
  {
    title: "Synergia branży",
    desc: "Inżynierowie w naszych strukturach dbają o parametry techniczne i materiałowe, podczas gdy eksperci branżowi odpowiadają za walidację użytkową sprzętu.",
  },
];

const certCards = [
  {
    tag: "MSWiA",
    title: "Koncesja MSWiA",
    desc: "Posiadamy uprawnienia do wytwarzania broni, amunicji oraz wyrobów o przeznaczeniu wojskowym lub policyjnym, a także obrotu materiałami wybuchowymi, bronią, amunicją oraz wyrobami i technologią o przeznaczeniu wojskowym lub policyjnym.",
  },
  {
    tag: "NATO",
    title: "NATO CAGE",
    desc: "Jesteśmy dostawcą zarejestrowanym w systemie kodyfikacyjnym NATO, co umożliwia nam współpracę w krajowych i międzynarodowych strukturach obronnych.",
  },
  {
    tag: "Lokalizacja",
    title: "Strategiczna lokalizacja",
    desc: "Nasze lokalizacje w Małopolsce, przy głównych węzłach komunikacyjnych, zapewniają bezpieczne i profesjonalne zaplecze do realizacji transakcji.",
  },
];

const clientSegments = [
  {
    tag: "Wojsko",
    title: "Siły Zbrojne",
    desc: "Dostarczamy uzbrojenie i wyposażenie spełniające najwyższe standardy wojskowe, testowane w warunkach operacyjnych.",
    href: "/wspolpraca",
    icon: (
      /* Compass rose / tactical map marker */
      <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
        <circle cx="100" cy="100" r="82" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
        {/* 4-pointed diamond star — vertical */}
        <polygon points="100,18 128,100 100,182 72,100" stroke="currentColor" strokeWidth="1.0" fill="none" opacity="0.55" />
        {/* 4-pointed diamond star — horizontal */}
        <polygon points="182,100 100,128 18,100 100,72" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.4" />
        {/* Inner diamond */}
        <polygon points="100,60 140,100 100,140 60,100" stroke="currentColor" strokeWidth="0.65" fill="none" opacity="0.3" />
        {/* Cardinal tick marks */}
        <line x1="100" y1="18" x2="100" y2="30" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <line x1="100" y1="170" x2="100" y2="182" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <line x1="18" y1="100" x2="30" y2="100" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <line x1="170" y1="100" x2="182" y2="100" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        {/* Center ring */}
        <circle cx="100" cy="100" r="6" stroke="currentColor" strokeWidth="0.7" opacity="0.5" fill="none" />
      </svg>
    ),
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    icon: (
      /* Shield / badge */
      <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
        {/* Outer shield */}
        <path d="M100 16 L172 46 L172 110 Q172 160 100 184 Q28 160 28 110 L28 46 Z" stroke="currentColor" strokeWidth="1.0" fill="none" opacity="0.55" />
        {/* Inner shield */}
        <path d="M100 36 L152 62 L152 110 Q152 148 100 166 Q48 148 48 110 L48 62 Z" stroke="currentColor" strokeWidth="0.65" fill="none" opacity="0.35" />
        {/* Vertical axis */}
        <line x1="100" y1="36" x2="100" y2="150" stroke="currentColor" strokeWidth="0.5" opacity="0.22" strokeDasharray="4 3" />
        {/* Horizontal axis */}
        <line x1="54" y1="96" x2="146" y2="96" stroke="currentColor" strokeWidth="0.5" opacity="0.22" strokeDasharray="4 3" />
        {/* Center mark */}
        <circle cx="100" cy="96" r="4" stroke="currentColor" strokeWidth="0.7" opacity="0.45" fill="none" />
      </svg>
    ),
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    icon: (
      /* Delta / nested triangles */
      <svg viewBox="0 0 200 200" fill="none" className="w-60 h-60 text-accent">
        {/* Outer triangle */}
        <polygon points="100,16 186,166 14,166" stroke="currentColor" strokeWidth="1.0" fill="none" opacity="0.55" />
        {/* Mid triangle */}
        <polygon points="100,50 162,150 38,150" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.38" />
        {/* Inner triangle */}
        <polygon points="100,84 138,134 62,134" stroke="currentColor" strokeWidth="0.65" fill="none" opacity="0.28" />
        {/* Altitude line */}
        <line x1="100" y1="16" x2="100" y2="166" stroke="currentColor" strokeWidth="0.5" opacity="0.18" strokeDasharray="5 4" />
        {/* Base midpoint mark */}
        <line x1="96" y1="166" x2="104" y2="166" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        {/* Apex mark */}
        <line x1="96" y1="16" x2="104" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        {/* Center circle */}
        <circle cx="100" cy="117" r="5" stroke="currentColor" strokeWidth="0.7" opacity="0.45" fill="none" />
      </svg>
    ),
  },
];

const fundamentyItems = [
  { title: "Interdyscyplinarne badania i rozwój", desc: "Nasze projekty badawcze łączą wiele dziedzin nauki." },
  { title: "Wszechstronność projektowa", desc: "Tworzymy koncepcje dla różnych rodzajów uzbrojenia." },
  { title: "Nowoczesne materiały", desc: "Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji." },
  { title: "Innowacja procesowa", desc: "Wdrażamy rozwiązania, które redefiniują skuteczność, ergonomię i trwałość systemów obronnych." },
  { title: "Inżynieria precyzyjna", desc: "Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań." },
  { title: "Transparentność", desc: "Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli." },
];

/* ──────────── PAGE ──────────── */

export default function ONasPage() {
  const [openFundament, setOpenFundament] = useState<number | null>(null);

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / O nas" title="O nas" video="/hero-onas.mp4" />

      {/* ─── INTRO DESCRIPTION ─── */}
      <section className="py-16 md:py-32 px-[clamp(24px,4vw,64px)] border-b border-white/10">
        <ScrollRevealText
          text="Powstaliśmy z połączenia ekspertów zaawansowanej inżynierii i sektora strzelecko-obronnego. Ta synergia pozwala nam wytwarzać uzbrojenie, które odpowiada na realne potrzeby użytkownika."
          className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
            [ Rozpocznij współpracę ]
          </ScrambleLink>
        </div>
      </section>

      {/* ─── MISSION SECTION ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Left */}
        <div className="px-[clamp(24px,4vw,64px)] pt-9 pb-4 flex flex-col h-full border-b md:border-b-0">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px]"
            speed={45}
          >
            Nasza misja, Innowacja i rzetelność
          </TypewriterTitle>
          <div className="mt-6 md:mt-auto">
            <TacticalReadout />
          </div>
        </div>

        {/* Right */}
        <div className="pt-10 md:pt-16 pb-4 px-[clamp(24px,4vw,64px)]">
          <div className="flex flex-col gap-9">
            {missionItems.map((item, i) => (
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

      {/* ─── ASCII PLANE ─── */}
      <AsciiHelicopter />

      {/* ─── SECOND DESCRIPTION ─── */}
      <section>
        <div className="py-16 px-[clamp(24px,4vw,64px)]">
          <ScrollRevealText
            text="Działamy w oparciu o własną infrastrukturę technologiczną w Krakowie, co pozwala na sprawne zarządzanie kluczowymi procesami produkcyjnymi oraz logistyką obrotu specjalnego."
            className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
            indent={2}
          />
          <div className="flex justify-end mt-11">
            <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
              [ Rozpocznij współpracę ]
            </ScrambleLink>
          </div>
        </div>

        {/* ─── CERTIFICATION CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/5 px-[clamp(24px,4vw,64px)]">
          {certCards.map((card, i) => (
            <AnimateIn key={i} delay={i * 0.25} y={20}>
              <div
                className={`py-9 px-4 md:px-9 flex flex-col gap-6 h-full ${
                  i < certCards.length - 1 ? "md:border-r md:border-white/5 border-b border-white/5 md:border-b-0" : ""
                }`}
              >
                <div className="flex flex-col gap-2.5">
                  <span className="inline-block border border-white/15 px-2 py-1 w-fit">
                    <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[0.28px]">
                      {card.tag}
                    </span>
                  </span>
                  <h3 className="text-text text-[28px] font-medium leading-[34px]">
                    {card.title}
                  </h3>
                  <p className="text-text-dim text-[14px] font-normal leading-[21px]">
                    {card.desc}
                  </p>
                </div>
                <ScrambleLink href="#" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] mt-auto">
                  [ Więcej ]
                </ScrambleLink>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* ─── DLA KOGO PRACUJEMY ─── */}
      <section className="relative border-b border-white/10">
        <div className="border-t border-white/[0.25]" />

        <div className="absolute top-0 left-0 px-[clamp(24px,4vw,64px)] py-2 z-10 pointer-events-none">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //04 KLIENCI
          </span>
        </div>

        <div className="px-[clamp(24px,4vw,64px)] pt-16 pb-10">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,9.26vw,140px)] font-normal text-text leading-[1] tracking-[-1px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            Dla kogo pracujemy
          </TypewriterTitle>
          <p className="text-text-dim text-[18px] font-normal leading-[30px] max-w-[700px] mt-6">
            Swoje usługi kierujemy do szerokiego spektrum odbiorców — od
            jednostek wojskowych i policyjnych, przez instytucje badawcze, aż
            po partnerów przemysłowych w modelu B2B.
          </p>
        </div>

        <div className="mx-[clamp(24px,4vw,64px)] grid grid-cols-1 md:grid-cols-3 h-auto md:h-[680px] border-t border-white/[0.08]">
          {clientSegments.map((seg, i) => (
            <div key={seg.tag} className={`${i < clientSegments.length - 1 ? "md:border-r" : ""} border-b border-white/[0.08] flex flex-col justify-between px-6 py-8 md:px-10 md:py-12`}>
              <div className="hidden md:flex flex-1 items-center justify-center">
                {seg.icon}
              </div>
              <div>
                <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">
                  {seg.tag}
                </div>
                <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">
                  {seg.title}
                </h3>
                <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8">
                  {seg.desc}
                </p>
                <ScrambleLink href={seg.href} className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                  [ Dowiedz się więcej ]
                </ScrambleLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FUNDAMENTY NASZEJ DZIAŁALNOŚCI ─── */}
      <section className="grid grid-cols-1 md:grid-cols-[0.6fr_1fr]">
        {/* Left */}
        <div className="md:border-r border-white/10 pt-12 md:pt-24 px-[clamp(24px,4vw,64px)] pb-12 md:pb-16 flex flex-col h-full">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,3.17vw,48px)] font-light text-text leading-[53px] tracking-[-0.48px]"
            speed={50}
          >
            Fundamenty naszej działalności
          </TypewriterTitle>
          <div className="mt-auto">
            <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
              [ Rozpocznij współpracę ]
            </ScrambleLink>
          </div>
        </div>

        {/* Right - Accordion */}
        <div className="pb-12 md:pb-16 pr-0">
          {fundamentyItems.map((item, i) => (
            <AnimateIn key={i} delay={i * 0.06} y={15}>
              <div
                className={`border-b border-white/10 px-[clamp(24px,4vw,64px)] ${i === 0 ? "pt-10 md:pt-32" : "pt-6"}`}
              >
                <button
                  onClick={() =>
                    setOpenFundament(openFundament === i ? null : i)
                  }
                  className="w-full text-left flex items-center justify-between gap-4 pb-6 group"
                >
                  <span
                    className={`text-[28px] font-medium leading-[34px] transition-colors duration-300 ${
                      openFundament === i
                        ? "text-text"
                        : "text-text-dim group-hover:text-text"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="font-[var(--font-mono)] text-[20px] tracking-[0.2px] shrink-0">
                    <span className="text-text-dim text-2xl">[</span>
                    <span className="text-accent">
                      {openFundament === i ? "−" : "+"}
                    </span>
                    <span className="text-text-dim text-2xl">]</span>
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    openFundament === i ? "max-h-[200px] pb-6" : "max-h-0"
                  }`}
                >
                  <p className="text-text-dim text-[15px] leading-[24px]">
                    {item.desc}
                  </p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>
    </main>
  );
}
