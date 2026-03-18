"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimateIn from "@/components/AnimateIn";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import MilitaryMap from "@/components/MilitaryMap";
import TypewriterTitle from "@/components/TypewriterTitle";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

/* ──────────── DATA ──────────── */

const services = [
  {
    id: "01",
    label: "Projektowanie i R&D",
    title: "Projektowanie i badania rozwojowe",
    desc: "Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.",
    tags: ["CAD/CAM", "Analizy MES", "Inżynieria odwrotna"],
    img: "/service-01.jpg",
  },
  {
    id: "02",
    label: "Produkcja",
    title: "Produkcja komponentów",
    desc: "Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem precyzyjnych technologii CNC, obróbki cieplnej i kontroli jakości zgodnej ze standardami NATO.",
    tags: ["CNC", "Obróbka cieplna", "Kontrola jakości"],
    img: "/service-02.jpg",
  },
  {
    id: "03",
    label: "Dystrybucja",
    title: "Obrót i dystrybucja",
    desc: "Prowadzimy licencjonowaną działalność handlową w zakresie broni, amunicji oraz wyposażenia specjalnego dla sektora obronnego i odbiorców cywilnych.",
    tags: ["B2G", "B2B", "Rynek cywilny"],
    img: "/service-03.jpg",
  },
  {
    id: "04",
    label: "Serwis",
    title: "Serwis i modernizacja",
    desc: "Zapewniamy kompleksowy serwis techniczny, modernizację istniejących systemów uzbrojenia oraz dostosowanie do aktualnych standardów operacyjnych.",
    tags: ["Modernizacja", "Diagnostyka", "Kalibracja"],
    img: "/service-04.jpg",
  },
];

const filary = [
  {
    tag: "B2G",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych.",
  },
  {
    tag: "B2G",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych.",
  },
  {
    tag: "B2G",
    title: "Rynek cywilny",
    desc: "Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych.",
  },
];

/* ──────────── PAGE ──────────── */

export default function HomePage() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
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

  /* No GSAP needed — pure CSS sticky stacking */

  return (
    <main>
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-bg">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[15] pointer-events-none"
        />

        {/* Video background — full cover */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Text cutout mask — black bg with mix-blend-multiply reveals video through text */}
        <div className="absolute inset-0 z-[3] bg-black mix-blend-multiply flex flex-col justify-center px-[clamp(24px,4vw,80px)]">
          <TypewriterTitle
            as="h1"
            className="text-[clamp(5rem,12vw,12rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase"
            speed={70}
            delay={800}
          >
            PRECYZJA.
          </TypewriterTitle>
          <TypewriterTitle
            as="span"
            className="text-[clamp(5rem,12vw,12rem)] font-bold text-accent leading-[0.9] tracking-[-0.04em] uppercase block"
            speed={70}
            delay={1400}
          >
            PRZEWAGA.
          </TypewriterTitle>
        </div>

        {/* Subtle dark overlay on top */}
        <div className="absolute inset-0 z-[3] bg-bg/15 pointer-events-none" />

        {/* HUD UI layer + bottom content */}
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <div className="absolute top-[100px] left-[clamp(24px,4vw,80px)] font-[var(--font-mono)] text-[11px] text-accent leading-[2.2] opacity-60 hidden md:block">
            <div>// HYDRA ARMS</div>
            <div>// PL-2026</div>
            <div>// KRAKÓW, PL</div>
          </div>
          <div className="absolute top-[100px] right-[clamp(24px,4vw,80px)] font-[var(--font-mono)] text-[11px] text-accent text-right leading-[2.2] opacity-60 hidden md:block">
            <div>[ 52°24&apos;N ]</div>
            <div>[ 016°55&apos;E ]</div>
            <div>[ SEC // DEF ]</div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-16 left-16 right-16 pointer-events-auto">
            <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-6 block">
              // HYDRA ARMS - PL-2026
            </span>
            <SplitText
              as="p"
              className="text-[clamp(2rem,4.76vw,72px)] font-normal text-text-dim leading-[76px] tracking-[-2px]"
              splitBy="words"
              staggerAmount={0.06}
              delay={0.6}
            >
              Zaawansowana inżynieria obronna Obrót nowoczesnym uzbrojeniem
            </SplitText>

            <div className="flex gap-12 mt-8 items-center">
              <ScrambleLink
                href="/uslugi"
                className="font-[var(--font-mono)] text-[28px] tracking-[0.3px] hover:text-white transition-colors duration-300"
              >
                [ Nasze usługi ]
              </ScrambleLink>
              <ScrambleLink
                href="/sklep"
                className="font-[var(--font-mono)] text-[28px] tracking-[0.3px] hover:text-white transition-colors duration-300"
              >
                [ Sklep ]
              </ScrambleLink>
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
              className="sticky top-0 h-screen border-t border-white/5"
              style={{ zIndex: i + 1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[0.75fr_1fr] h-full bg-bg">
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
                <div className="border-l border-text-dim/25 px-10 flex flex-col justify-center">
                  <div className="max-w-[600px]">
                    <div className="flex items-center justify-between mb-10">
                      <span className="text-[18px] font-medium text-text-dim">
                        {service.label}
                      </span>
                      <div className="border border-text/50 px-2 py-1">
                        <span className="text-[18px]">
                          <span className="text-accent">{service.id}</span>
                          <span className="text-white/30">/{String(services.length).padStart(2, "0")}</span>
                        </span>
                      </div>
                    </div>

                    <h2 className="text-[48px] font-light text-text leading-[53px] tracking-[-0.48px] mb-9">
                      {service.title}
                    </h2>
                    <p className="text-[18px] font-light text-text-dim leading-[28px] mb-8">
                      {service.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex gap-2.5 items-center py-2.5 flex-wrap mb-8">
                      {service.tags.map((tag, ti) => (
                        <span key={ti} className="flex items-center gap-2.5">
                          <span className="font-[var(--font-mono)] text-[20px] text-accent tracking-[0.2px]">
                            {tag}
                          </span>
                          {ti < service.tags.length - 1 && (
                            <span className="w-[5px] h-[5px] bg-[#d9d9d9]" />
                          )}
                        </span>
                      ))}
                    </div>

                    <a
                      href="/uslugi"
                      className="font-[var(--font-mono)] text-[20px] bg-text-dim px-6 py-2 tracking-[0.2px] hover:bg-accent transition-colors duration-300 inline-block"
                    >
                      <span className="underline text-accent">Szczegóły</span> <span className="text-bg text-2xl">[</span><span className="text-bg">→</span><span className="text-bg text-2xl">]</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DESCRIPTION SECTION ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //02 SECTION
          </span>
        </div>
        <div className="py-20 px-16">
          <ScrollRevealText
            text="Realizujemy krytyczne projekty z zakresu wytwarzania uzbrojenia oraz technologii dual-use. Łączymy rygorystyczne standardy NATO z precyzją nowoczesnych technologii tworząc innowacje. Prowadzimy również działalność handlową na rynku cywilnym i specjalnym."
            className="text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] text-left"
            indent={2}
          />
          <div className="flex justify-end mt-8">
            <ScrambleLink
              href="/o-nas"
              className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
            >
              [ Zobacz więcej ]
            </ScrambleLink>
          </div>
        </div>
      </section>

      {/* ─── VIDEO SECTION ─── */}
      <div ref={videoSectionRef} className="h-[549px] bg-bg relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.5] contrast-[1.15] sepia-[0.15]"
        >
          <source src="/full.mov" type="video/mp4" />
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
        {/* Top gradient fade — long and fluid */}
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-bg via-bg/60 to-transparent z-[2]" />
        {/* Bottom gradient fade — long and fluid */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-bg via-bg/60 to-transparent z-[2]" />
      </div>

      {/* ─── POTENCJAŁ I OPOWIEDZIALNOŚĆ ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //03 SECTION
          </span>
        </div>
        <div className="px-16 pt-16">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(3rem,9.26vw,140px)] font-normal text-text leading-[1] tracking-[-2px] uppercase"
            speed={60}
          >
            POTENCJAŁ I OPOWIEDZIALNOŚĆ
          </TypewriterTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-16 pb-16">
            <div>
              <p className="text-text-dim text-[18px] font-normal leading-[30px]">
                HYDRA ARMS to krakowski ośrodek kompetencyjny dedykowany dla sektora
                Security & Defense. Specjalizujemy się w wytwarzaniu zaawansowanych
                komponentów o wysokim stopniu skomplikowania.
              </p>
            </div>
            <div className="flex items-start justify-end">
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
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //04 SECTION
          </span>
        </div>
        <div className="px-16 py-16">
          <ScrollRevealText
            text="Działamy w trzech strategicznych obszarach dystrybucji - od zamówień rządowych, przez kooperację przemysłową, po licencjonowany rynek cywilny. Każdy kanał obsługiwany jest zgodnie z obowiązującymi regulacjami prawnymi i standardami bezpieczeństwa."
            className="text-[clamp(1.5rem,3.17vw,48px)] font-light leading-[53px] tracking-[-0.48px] text-left"
          />
          <div className="flex justify-end mt-8">
            <ScrambleLink
              href="/wspolpraca"
              className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
            >
              [ Rozpocznij współpracę ]
            </ScrambleLink>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 px-16">
          {filary.map((item, i) => (
            <AnimateIn key={i} delay={i * 0.1} y={20}>
              <div className={`p-9 flex flex-col gap-2.5 ${
                i > 0 ? "md:border-l md:border-white/5" : ""
              }`}>
                <div className="border border-white/15 px-2 py-1 self-start mb-2">
                  <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[0.28px]">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-text text-[28px] font-medium leading-[34px]">
                  {item.title}
                </h3>
                <p className="text-text-dim text-[14px] font-normal leading-[21px]">
                  {item.desc}
                </p>
                <span className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] mt-2">
                  <span className="text-text-dim text-2xl">[</span>
                  <span className="text-accent underline"> Więcej </span>
                  <span className="text-text-dim text-2xl">]</span>
                </span>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* ─── MAP SECTION ─── */}
      <section>
        <div className="border-t border-white/[0.25] px-11 py-2">
          <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
            //05 SECTION
          </span>
        </div>
        <div className="h-[542px] bg-[#080808] relative overflow-hidden">
          <MilitaryMap />
          {/* Info overlay */}
          <div className="absolute left-16 top-8 z-10 font-[var(--font-mono)] text-[14px] text-accent/70 leading-[28px] tracking-[0.2px]">
            <p className="text-accent text-[16px] font-bold mb-2">HYDRA ARMS SP. Z O.O.</p>
            <p>[→] Kraków, Polska</p>
            <p>[→] 50°03&apos;N 019°56&apos;E</p>
          </div>
          <div className="absolute right-16 bottom-8 z-10">
            <a
              href="https://maps.google.com/?q=50.06,19.94"
              target="_blank"
              rel="noopener noreferrer"
              className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] border border-accent/40 px-6 py-2 hover:bg-accent hover:text-bg transition-all duration-300"
            >
              <span className="text-text-dim text-2xl">[</span> <span className="text-accent underline">Wyznacz Trasę →</span> <span className="text-text-dim text-2xl">]</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── KONTAKT ─── */}
      <section className="border-t border-white/5">
        <div className="px-14 pt-9">
          <AnimateIn>
            <TypewriterTitle
              as="h2"
              className="text-text text-[48px] font-light leading-[53px] tracking-[-0.48px]"
              speed={50}
            >
              Skontaktuj się z nami
            </TypewriterTitle>
          </AnimateIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 px-14 py-9 border-t border-white/5 mt-9">
          {/* Left — info */}
          <div className="pr-8">
            <AnimateIn>
              <p className="text-text text-[28px] font-medium leading-[34px] mb-6">
                Napisz do nas na wybrany z podanych maili
                albo uzupełnij formularz kontaktowy
              </p>
            </AnimateIn>
            <AnimateIn delay={0.1}>
              <div className="font-[var(--font-mono)] text-[14px] text-text-dim leading-[30px] space-y-1">
                <p>Koordynacja Projektów R&D: <span className="text-accent">[ research@hydra-arms.com ]</span></p>
                <p>Dział Zamówień Publicznych (B2G): <span className="text-accent">[ gov@hydra-arms.com ]</span></p>
                <p>Dział handlowy: <span className="text-accent">[ sprzedaz@hydra-arms.com ]</span></p>
                <p>Sekretariat: <span className="text-accent">[ office@hydra-arms.com ]</span></p>
              </div>
            </AnimateIn>
          </div>

          {/* Right — form */}
          <div className="border-l border-white/5 pl-9 pt-4">
            <AnimateIn delay={0.15}>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <input
                      type="text"
                      placeholder="IMIĘ"
                      className="w-full bg-transparent border-b border-white/10 pb-2 text-text font-[var(--font-mono)] text-[14px] tracking-[0.5px] focus:border-accent focus:outline-none transition-colors placeholder:text-text-dim/50"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="EMAIL"
                      className="w-full bg-transparent border-b border-white/10 pb-2 text-text font-[var(--font-mono)] text-[14px] tracking-[0.5px] focus:border-accent focus:outline-none transition-colors placeholder:text-text-dim/50"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="TYTUŁ"
                    className="w-full bg-transparent border-b border-white/10 pb-2 text-text font-[var(--font-mono)] text-[14px] tracking-[0.5px] focus:border-accent focus:outline-none transition-colors placeholder:text-text-dim/50"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="TREŚĆ"
                    rows={4}
                    className="w-full bg-transparent border border-white/10 p-3 text-text font-[var(--font-mono)] text-[14px] tracking-[0.5px] focus:border-accent focus:outline-none transition-colors resize-none placeholder:text-text-dim/50"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 accent-accent" />
                  <span className="text-text-dim text-[13px] leading-[18px]">
                    Wyrażam zgodę na przetwarzanie danych przez HYDRA ARMS w celu inicjacji
                    procedury kontaktowej. Akceptuję{" "}
                    <a href="/polityka-prywatnosci" className="text-accent hover:underline">
                      Politykę Prywatności
                    </a>.
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="font-[var(--font-mono)] text-[14px] bg-accent px-8 py-2 tracking-[1px] hover:bg-white transition-colors duration-300"
                  >
                    <span className="text-bg text-2xl">[</span> <span className="text-bg underline">Wyślij</span> <span className="text-bg text-2xl">]</span>
                  </button>
                </div>
              </form>
            </AnimateIn>
          </div>
        </div>
      </section>
    </main>
  );
}
