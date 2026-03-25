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
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <path d="M24 4 L44 18 L44 38 L24 44 L4 38 L4 18 Z" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M24 4 L24 44 M4 18 L44 18" stroke="#b8d95a" strokeWidth="0.6" opacity="0.3" className="draw-icon" />
      </svg>
    ),
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <circle cx="24" cy="16" r="10" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M8 44 Q8 30 24 30 Q40 30 40 44" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <line x1="24" y1="6" x2="24" y2="26" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" className="draw-icon" />
      </svg>
    ),
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect x="6" y="14" width="36" height="28" stroke="#b8d95a" strokeWidth="1.2" opacity="0.6" className="draw-icon" />
        <path d="M16 14 L16 8 L32 8 L32 14" stroke="#b8d95a" strokeWidth="1" opacity="0.5" className="draw-icon" />
        <line x1="6" y1="28" x2="42" y2="28" stroke="#b8d95a" strokeWidth="0.6" opacity="0.3" className="draw-icon" />
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
      <section className="py-32 px-[clamp(24px,4vw,64px)] border-b border-white/10">
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
        <div className="px-[clamp(24px,4vw,64px)] pt-9 pb-4 flex flex-col h-full">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px]"
            speed={45}
          >
            Nasza misja, Innowacja i rzetelność
          </TypewriterTitle>
          <div className="mt-auto">
            <TacticalReadout />
          </div>
        </div>

        {/* Right */}
        <div className="pt-16 pb-4 px-[clamp(24px,4vw,64px)]">
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
      <section className="border-b border-white/10">
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
                  i < certCards.length - 1 ? "md:border-r md:border-white/5" : ""
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
      <section className="border-b border-white/10 px-[clamp(24px,4vw,64px)] py-32">
        <div className="mb-16">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px] mb-6"
            speed={45}
          >
            Dla kogo pracujemy
          </TypewriterTitle>
          <AnimateIn delay={0.1}>
            <p className="text-text-dim text-[18px] font-normal leading-[30px] max-w-[700px]">
              Swoje usługi kierujemy do szerokiego spektrum odbiorców — od
              jednostek wojskowych i policyjnych, przez instytucje badawcze, aż
              po partnerów przemysłowych w modelu B2B.
            </p>
          </AnimateIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {clientSegments.map((seg, i) => (
            <DrawCard key={i} delay={i * 0.2}>
              <div className="p-8 flex flex-col gap-5 h-full">
                <div className="mb-2">{seg.icon}</div>
                <span className="inline-block border border-white/15 px-2 py-1 w-fit">
                  <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[0.28px]">
                    {seg.tag}
                  </span>
                </span>
                <h3 className="text-text text-[28px] font-medium leading-[34px]">
                  {seg.title}
                </h3>
                <p className="text-text-dim text-[14px] font-normal leading-[21px]">
                  {seg.desc}
                </p>
                <ScrambleLink href={seg.href} className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] mt-auto">
                  [ Więcej ]
                </ScrambleLink>
              </div>
            </DrawCard>
          ))}
        </div>
      </section>

      {/* ─── FUNDAMENTY NASZEJ DZIAŁALNOŚCI ─── */}
      <section className="grid grid-cols-1 md:grid-cols-[0.6fr_1fr]">
        {/* Left */}
        <div className="border-r border-white/10 pt-24 px-[clamp(24px,4vw,64px)] pb-16 flex flex-col h-full">
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
        <div className="pb-16 pr-8">
          {fundamentyItems.map((item, i) => (
            <AnimateIn key={i} delay={i * 0.06} y={15}>
              <div
                className="border-b border-white/10 pl-[clamp(24px,4vw,64px)] pr-9"
                style={{ paddingTop: i === 0 ? "128px" : "24px" }}
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
