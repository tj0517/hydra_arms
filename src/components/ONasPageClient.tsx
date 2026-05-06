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
import TacticalEdge from "@/components/TacticalEdge";


/* ──────────── DEFAULTS ──────────── */

const DEFAULT_MISSION_ITEMS = [
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

const DEFAULT_CERT_CARDS = [
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

const DEFAULT_FUNDAMENTY_ITEMS = [
  { title: "Interdyscyplinarne badania i rozwój", desc: "Nasze projekty badawcze łączą wiele dziedzin nauki." },
  { title: "Wszechstronność projektowa", desc: "Tworzymy koncepcje dla różnych rodzajów uzbrojenia." },
  { title: "Nowoczesne materiały", desc: "Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji." },
  { title: "Innowacja procesowa", desc: "Wdrażamy rozwiązania, które redefiniują skuteczność, ergonomię i trwałość systemów obronnych." },
  { title: "Inżynieria precyzyjna", desc: "Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań." },
  { title: "Transparentność", desc: "Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli." },
];

const DEFAULT_INTRO_TEXT = "Powstaliśmy z połączenia ekspertów zaawansowanej inżynierii i sektora strzelecko-obronnego. Ta synergia pozwala nam wytwarzać uzbrojenie, które odpowiada na realne potrzeby użytkownika.";

interface ONasPageClientProps {
  introText?: string
  missionItems?: typeof DEFAULT_MISSION_ITEMS
  certCards?: typeof DEFAULT_CERT_CARDS
  fundamentyItems?: typeof DEFAULT_FUNDAMENTY_ITEMS
}

const clientSegments = [
  {
    tag: "Wojsko",
    title: "Siły Zbrojne",
    desc: "Dostarczamy uzbrojenie i wyposażenie spełniające najwyższe standardy wojskowe, testowane w warunkach operacyjnych.",
    href: "/wspolpraca",
    img: "/img/army-ranger-in-field-uniforms-2026-03-18-17-39-05-utc.jpg",
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    img: "/img/tactical-gun-in-olive-glove-on-white-backdrop-2026-03-20-00-48-48-utc.jpg",
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    img: "/img/cnc-part.png",
  },
];

/* ──────────── PAGE ──────────── */

export default function ONasPageClient({
  introText = DEFAULT_INTRO_TEXT,
  missionItems = DEFAULT_MISSION_ITEMS,
  certCards = DEFAULT_CERT_CARDS,
  fundamentyItems = DEFAULT_FUNDAMENTY_ITEMS,
}: ONasPageClientProps = {}) {
  const [openFundament, setOpenFundament] = useState<number | null>(null);

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / O nas" title="O nas" video="/video/hero-onas.mp4" />

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
            <ScrambleLink href="/wspolpraca" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
              Rozpocznij współpracę
            </ScrambleLink>
          </div>
        </div>
      </section>

      {/* ─── MISSION SECTION ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Left */}
        <div className="px-[clamp(32px,5vw,64px)] pt-20 pb-4 flex flex-col h-full border-b md:border-b-0">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px]"
            speed={45}
          >
            Nasza misja, Innowacja i rzetelność
          </TypewriterTitle>
          <div className="mt-6 md:mt-auto flex-1 flex items-end">
            <TacticalReadout />
          </div>
        </div>

        {/* Right */}
        <div className="pt-20 pb-4 px-[clamp(32px,5vw,64px)]">
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
        <div className="py-16 px-[clamp(32px,5vw,64px)]">
          <ScrollRevealText
            text="Działamy w oparciu o własną infrastrukturę technologiczną w Krakowie, co pozwala na sprawne zarządzanie kluczowymi procesami produkcyjnymi oraz logistyką obrotu specjalnego."
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
        </div>

        {/* ─── CERTIFICATION CARDS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border-t border-white/5 px-[clamp(32px,5vw,64px)]">
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
                  <h3 className="text-text text-[clamp(1.25rem,3vw,28px)] font-medium leading-[1.2]">
                    {card.title}
                  </h3>
                  <p className="text-text-dim text-[14px] font-normal leading-[21px] text-justify">
                    {card.desc}
                  </p>
                </div>
                <div className="relative px-6 py-1.5 inline-flex items-center w-fit mt-auto">
                  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                  <ScrambleLink href="#" className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
                    Więcej
                  </ScrambleLink>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* ─── DLA KOGO PRACUJEMY ─── */}
      <section className="relative border-b border-white/10">
        <div className="border-t border-white/[0.25]" />

        <div className="absolute top-0 left-0 px-[clamp(32px,5vw,64px)] py-2 z-10 pointer-events-none">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //04 KLIENCI
          </span>
        </div>

        <div className="px-[clamp(32px,5vw,64px)] pt-16 pb-10">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.75rem,9.26vw,140px)] font-medium text-white leading-[1.05] tracking-[-0.5px] md:tracking-[-2px] uppercase"
            speed={60}
          >
            Dla kogo pracujemy
          </TypewriterTitle>
          <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] max-w-[700px] mt-6 text-justify">
            Swoje usługi kierujemy do szerokiego spektrum odbiorców — od
            jednostek wojskowych i policyjnych, przez instytucje badawcze, aż
            po partnerów przemysłowych w modelu B2B.
          </p>
        </div>

        <div className="mx-[clamp(32px,5vw,64px)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border-t border-white/[0.08]">
          {clientSegments.map((seg, i) => (
            <div key={seg.tag} className={`${i < clientSegments.length - 1 ? "md:border-r" : ""} border-b border-white/[0.08] flex flex-col py-8 md:px-10 md:py-12`}>
              <div className="h-[260px] hidden md:block mb-8">
                <TacticalEdge src={seg.img} alt={seg.title} glow="green" width={900} height={450} className="w-full h-full" />
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

      {/* ─── FUNDAMENTY NASZEJ DZIAŁALNOŚCI ─── */}
      <section className="grid grid-cols-1 md:grid-cols-[0.6fr_1fr]">
        {/* Left */}
        <div className="md:border-r border-white/10 pt-12 md:pt-24 px-[clamp(32px,5vw,64px)] pb-12 md:pb-16 flex flex-col h-full">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px]"
            speed={50}
          >
            Fundamenty naszej działalności
          </TypewriterTitle>
          <div className="mt-auto">
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
        </div>

        {/* Right - Accordion */}
        <div className="pb-12 md:pb-16 pr-0">
          {fundamentyItems.map((item, i) => (
            <AnimateIn key={i} delay={i * 0.06} y={15}>
              <div
                className={`border-b border-white/10 px-[clamp(32px,5vw,64px)] ${i === 0 ? "pt-10 md:pt-32" : "pt-6"}`}
              >
                <button
                  onClick={() =>
                    setOpenFundament(openFundament === i ? null : i)
                  }
                  className="w-full text-left flex items-center justify-between gap-4 pb-6 group"
                >
                  <span
                    className={`text-[clamp(1.25rem,3vw,28px)] font-medium leading-[1.2] transition-colors duration-300 ${
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
                  <p className="text-text-dim text-[15px] leading-[24px] text-justify">
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
