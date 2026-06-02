"use client";

import SubpageHero from "@/components/SubpageHero";
import CornerCTA from "@/components/ui/CornerCTA";
import IntroBlock from "@/components/sections/IntroBlock";
import ClientSegmentsGrid, { USLUGI_SEGMENTS } from "@/components/sections/ClientSegmentsGrid";
import TabPanel from "@/components/sections/TabPanel";
import TagBullets from "@/components/sections/TagBullets";
import TitleLeadSection from "@/components/sections/TitleLeadSection";


/* ──────────── DATA ──────────── */

const DEFAULT_COMPETENCIES = [
  {
    id: "01",
    tab: "Projektowanie i R&D",
    title: "Projektowanie i badania rozwojowe",
    desc: "Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.",
    tags: ["CAD/CAM", "Analizy MES", "Inżynieria odwrotna"],
    cta: "Zapytaj o projekt",
    img: "/img/service-01.jpg",
  },
  {
    id: "02",
    tab: "Obróbka CNC",
    title: "Precyzyjna obróbka CNC",
    desc: "Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem wieloosiowych centrów obróbczych CNC. Tolerancje na poziomie mikrometrów, powtarzalność seryjna i pełna kontrola wymiarowa każdej partii.",
    tags: ["Frezowanie 5-osi", "Toczenie CNC", "Kontrola CMM"],
    cta: "Zapytaj o produkcję",
    img: "/img/service-02.jpg",
  },
  {
    id: "03",
    tab: "Druk 3D",
    title: "Druk 3D i prototypowanie",
    desc: "Wykorzystujemy technologie przyrostowe do szybkiego prototypowania i produkcji funkcjonalnych komponentów. Druk metalowy SLM oraz polimerowy FDM/SLA pozwala na iteracyjne testowanie koncepcji.",
    tags: ["SLM/DMLS", "FDM/SLA", "Rapid prototyping"],
    cta: "Zapytaj o prototyp",
    img: "/img/service-03.jpg",
  },
  {
    id: "04",
    tab: "Kontrola jakości",
    title: "Kontrola jakości i certyfikacja",
    desc: "Każdy wyrób przechodzi wieloetapowy proces kontroli jakości zgodny ze standardami NATO AQAP. Stosujemy zaawansowane metody pomiarowe, testy balistyczne i analizy metalurgiczne.",
    tags: ["AQAP", "Testy balistyczne", "Metrologia"],
    cta: "Zapytaj o certyfikację",
    img: "/img/service-04.jpg",
  },
  {
    id: "05",
    tab: "Montaż i serwis",
    title: "Montaż końcowy i serwis techniczny",
    desc: "Zapewniamy kompleksowy montaż systemów uzbrojenia, modernizację istniejących platform oraz serwis gwarancyjny i pogwarancyjny. Każda jednostka przechodzi testy funkcjonalne przed przekazaniem.",
    tags: ["Modernizacja", "Diagnostyka", "Kalibracja"],
    cta: "Zapytaj o serwis",
    img: "/img/service-01.jpg",
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

  return (
    <main>
      {/* ─── HERO ─── */}
      <SubpageHero subtitle="HYDRA ARMS / Usługi" title="Usługi" video="/video/hero-uslugi.mp4" />

      {/* ─── INTRO DESCRIPTION ─── */}
      <IntroBlock
        text={introText}
        ctaHref="#"
        ctaLabel="Zapytaj o wycenę"
        borderBottom
      />

      {/* ─── NASZE KOMPETENCJE ─── */}
      <section className="border-b border-white/10">
        {/* Title */}
        <div className="flex items-center justify-center py-10 md:py-20 px-[clamp(32px,5vw,64px)]">
          <h2 className="text-[clamp(1.75rem,4.76vw,72px)] font-medium text-white leading-[1.1] md:leading-[76px] tracking-[-1.44px]">
            Nasze kompetencje
          </h2>
        </div>

        <TabPanel
          tabs={competencies.map((c) => ({ id: c.id, label: c.tab }))}
          contentPb="pb-2"
          contentBorder={false}
          contentClassName="relative z-10"
        >
          {(activeId) => {
            const comp = competencies.find((c) => c.id === activeId)
            if (!comp) return null
            return (
              <>
                <h3 className="text-[clamp(1.5rem,3.17vw,48px)] font-normal text-white leading-[1.15] md:leading-[53px] tracking-[-0.48px] mb-6">
                  {comp.title}
                </h3>
                <p className="text-[15px] md:text-[18px] font-light text-text-dim leading-[1.7] md:leading-[23px] max-w-[749px] mb-8 text-justify">
                  {comp.desc}
                </p>
                <TagBullets tags={comp.tags} className="mb-8" />
                <div className="flex justify-end">
                  <CornerCTA href="#" label={comp.cta} />
                </div>
              </>
            )
          }}
        </TabPanel>

        {/* Full-width video */}
        <div className="relative h-[300px] sm:h-[460px] md:h-[680px] overflow-hidden -mt-16">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.35] contrast-[1.1] sepia-[0.15]"
          >
            <source src="/video/aerial-view.mp4" type="video/mp4" />
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
      <TitleLeadSection
        sectionLabel="//05 KLIENCI"
        title="Dla kogo pracujemy"
        body="Swoje usługi kierujemy do szerokiego spektrum odbiorców — od jednostek wojskowych i policyjnych, przez instytucje badawcze, aż po partnerów przemysłowych w modelu B2B."
        sectionClassName="border-b border-white/10"
        pt="pt-8 md:pt-16"
        bodyGridCols="md:grid-cols-2"
        bodyPb="pb-8 md:pb-16"
      >
        <ClientSegmentsGrid segments={USLUGI_SEGMENTS} topBorder plain />
      </TitleLeadSection>

      {/* ─── WSPÓŁPRACA CTA ─── */}
      <IntroBlock
        text="Dostarczamy rozwiązania tam, gdzie standardowe metody zawodzą. Szukasz partnera technologicznego do projektu obronnego lub cywilnego?"
        ctaHref="/wspolpraca"
        ctaLabel="Rozpocznij współpracę"
        borderBottom
      />
    </main>
  );
}
