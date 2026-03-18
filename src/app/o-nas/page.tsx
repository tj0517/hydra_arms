"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimateIn from "@/components/AnimateIn";
import SplitText from "@/components/SplitText";
import ScrollRevealText from "@/components/ScrollRevealText";
import ScrambleLink from "@/components/ScrambleLink";
import TypewriterTitle from "@/components/TypewriterTitle";
import DrawReveal from "@/components/DrawReveal";
import AsciiHelicopter from "@/components/AsciiHelicopter";

gsap.registerPlugin(ScrollTrigger);

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

const fundamentyItems = [
  "Interdyscyplinarne badania i rozwój",
  "Wszechstronność projektowa",
  "Nowoczesne materiały",
  "Innowacja procesowa",
  "Inżynieria precyzyjna",
  "Transparentność",
];

/* ──────────── PAGE ──────────── */

export default function ONasPage() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [openFundament, setOpenFundament] = useState<number | null>(null);

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
      <section className="relative h-[700px] flex flex-col justify-end px-[clamp(24px,4vw,64px)] pb-2.5 border-b border-white/10">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[5] pointer-events-none"
        />
        <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-2.5 relative z-[1]">
          HYDRA ARMS / O nas
        </span>
        <TypewriterTitle
          as="h1"
          className="text-[clamp(4rem,12vw,140px)] font-semibold text-text leading-none tracking-[-3px] relative z-[1]"
          speed={80}
          delay={800}
        >
          O nas
        </TypewriterTitle>
      </section>

      {/* ─── INTRO DESCRIPTION ─── */}
      <section className="py-32 px-[clamp(24px,4vw,64px)] border-b border-white/10">
        <ScrollRevealText
          text="Powstaliśmy z połączenia ekspertów zaawansowanej inżynierii i sektora strzelecko-obronnego. Ta synergia pozwala nam wytwarzać uzbrojenie, które odpowiada na realne potrzeby użytkownika."
          className="text-[1.75rem] md:text-[3.2vw] font-medium leading-[1.1] tracking-[-0.48px] text-left"
          indent={2}
        />
        <div className="flex justify-end mt-11">
          <ScrambleLink
            href="/wspolpraca"
            className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
          >
            [ Rozpocznij współpracę ]
          </ScrambleLink>
        </div>
      </section>

      {/* ─── MISSION SECTION ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Left */}
        <div className="px-[clamp(24px,4vw,64px)] py-9">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px]"
            speed={45}
          >
            Nasza misja, Innowacja i rzetelność
          </TypewriterTitle>
        </div>

        {/* Right */}
        <div className="pt-16 px-[clamp(24px,4vw,64px)]">
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
            <ScrambleLink
              href="/wspolpraca"
              className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] hover:text-white transition-colors duration-300"
            >
              [ Rozpocznij współpracę ]
            </ScrambleLink>
          </div>
        </div>

        {/* ─── CERTIFICATION CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/5 px-[clamp(24px,4vw,64px)]">
          {certCards.map((card, i) => (
            <AnimateIn key={i} delay={i * 0.1} y={20}>
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
                <ScrambleLink
                  href="/wspolpraca"
                  className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] text-accent hover:text-white transition-colors duration-300 mt-auto"
                >
                  [ Więcej ]
                </ScrambleLink>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* ─── DLA KOGO PRACUJEMY ─── */}
      <section className="border-b border-white/10 px-[clamp(24px,4vw,64px)] py-32">
        <div className="grid grid-cols-1 md:grid-cols-[0.5fr_0.75fr_1fr] gap-9">
          <TypewriterTitle
            as="h2"
            className="text-text text-[28px] font-medium leading-[34px]"
            speed={45}
          >
            Dla kogo pracujemy
          </TypewriterTitle>

          <div className="flex flex-col gap-2.5">
            <AnimateIn delay={0.1}>
              <p className="text-text-dim text-[18px] font-normal leading-[30px]">
                Swoje usługi kierujemy do szerokiego spektrum odbiorców — od
                jednostek wojskowych i policyjnych, przez instytucje badawcze, aż
                po partnerów przemysłowych w modelu B2B. Każda relacja opiera się
                na dyskrecji, profesjonalizmie i dążeniu do doskonałości
                technicznej.
              </p>
            </AnimateIn>
            <div className="flex justify-end mt-auto pt-6">
              <ScrambleLink
                href="/wspolpraca"
                className="font-[var(--font-mono)] text-[20px] tracking-[0.2px] text-accent hover:text-white transition-colors duration-300"
              >
                [ Rozpocznij współpracę ]
              </ScrambleLink>
            </div>
          </div>

          <AnimateIn delay={0.2}>
            <div className="relative h-[306px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#061106] via-[#0a120a] to-[#050505] opacity-25" />
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ─── FUNDAMENTY NASZEJ DZIAŁALNOŚCI ─── */}
      <section className="grid grid-cols-1 md:grid-cols-[0.6fr_1fr]">
        {/* Left */}
        <div className="border-r border-white/10 pt-24 px-[clamp(24px,4vw,64px)]">
          <TypewriterTitle
            as="h2"
            className="text-[clamp(2rem,3.17vw,48px)] font-light text-text leading-[53px] tracking-[-0.48px]"
            speed={50}
          >
            Fundamenty naszej działalności
          </TypewriterTitle>
        </div>

        {/* Right - Accordion */}
        <div className="pb-16 pr-8">
          {fundamentyItems.map((item, i) => (
            <AnimateIn key={i} delay={i * 0.06} y={15}>
              <button
                onClick={() =>
                  setOpenFundament(openFundament === i ? null : i)
                }
                className="w-full text-left border-b border-white/10 flex items-center justify-between gap-4 pb-6 pl-[clamp(24px,4vw,64px)] pr-9 group"
                style={{ paddingTop: i === 0 ? "128px" : "24px" }}
              >
                <span
                  className={`text-[28px] font-medium leading-[34px] transition-colors duration-300 ${
                    openFundament === i
                      ? "text-text"
                      : "text-text-dim group-hover:text-text"
                  }`}
                >
                  {item}
                </span>
                <span className="font-[var(--font-mono)] text-[20px] tracking-[0.2px] shrink-0">
                  <span className="text-text-dim text-2xl">[</span>
                  <span className="text-accent">
                    {openFundament === i ? "−" : "+"}
                  </span>
                  <span className="text-text-dim text-2xl">]</span>
                </span>
              </button>
            </AnimateIn>
          ))}
        </div>
      </section>
    </main>
  );
}
