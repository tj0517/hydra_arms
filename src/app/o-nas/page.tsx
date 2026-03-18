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
import DrawCard from "@/components/DrawCard";

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
  { title: "Interdyscyplinarne badania i rozwój", desc: "Nasze projekty badawcze łączą wiele dziedzin nauki." },
  { title: "Wszechstronność projektowa", desc: "Tworzymy koncepcje dla różnych rodzajów uzbrojenia." },
  { title: "Nowoczesne materiały", desc: "Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji." },
  { title: "Innowacja procesowa", desc: "Wdrażamy rozwiązania, które redefiniują skuteczność, ergonomię i trwałość systemów obronnych." },
  { title: "Inżynieria precyzyjna", desc: "Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań." },
  { title: "Transparentność", desc: "Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli." },
];

/* ──────────── PAGE ──────────── */

export default function ONasPage() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pixCanvasRef = useRef<HTMLCanvasElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const lineXRef = useRef<HTMLDivElement>(null);
  const lineYRef = useRef<HTMLDivElement>(null);
  const [openFundament, setOpenFundament] = useState<number | null>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(
      overlayRef.current,
      { opacity: 1 },
      { opacity: 0, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  /* ── Video playback + glitch on loop ── */
  useEffect(() => {
    const vid = videoRef.current;
    const canvas = pixCanvasRef.current;
    if (!vid) return;
    vid.pause();

    const waitForLoad = () => {
      if (document.documentElement.classList.contains("loading-active")) {
        requestAnimationFrame(waitForLoad);
      } else {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    };
    waitForLoad();

    // Trigger glitch when video loops (seeked fires on loop restart)
    const onSeeked = () => {
      if (!canvas || vid.currentTime > 0.5) return;
      canvas.classList.remove("glitch-once");
      void canvas.offsetWidth; // force reflow to restart animation
      canvas.classList.add("glitch-once");
    };

    vid.addEventListener("seeked", onSeeked);
    return () => vid.removeEventListener("seeked", onSeeked);
  }, []);

  /* ── Grain canvas — video + heavy animated noise ── */
  useEffect(() => {
    const vid = videoRef.current;
    const canvas = pixCanvasRef.current;
    if (!vid || !canvas) return;

    const ctx = canvas.getContext("2d")!;
    const W = 1280;
    const H = 720;
    canvas.width = W;
    canvas.height = H;

    // Pre-generate a large noise texture (once)
    const noiseCvs = document.createElement("canvas");
    noiseCvs.width = 512;
    noiseCvs.height = 512;
    const nCtx = noiseCvs.getContext("2d")!;
    const noiseImg = nCtx.createImageData(512, 512);
    const nd = noiseImg.data;
    for (let i = 0; i < nd.length; i += 4) {
      const v = Math.random() * 255;
      nd[i] = v;
      nd[i + 1] = v;
      nd[i + 2] = v;
      nd[i + 3] = 255;
    }
    nCtx.putImageData(noiseImg, 0, 0);

    let raf = 0;
    const draw = () => {
      if (!vid.paused && !vid.ended) {
        // Draw video frame
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(vid, 0, 0, W, H);

        // Darken heavily
        ctx.fillStyle = "rgba(10,10,11,0.65)";
        ctx.fillRect(0, 0, W, H);

        // Overlay subtle animated grain
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.15;
        const ox = Math.floor(Math.random() * 256);
        const oy = Math.floor(Math.random() * 256);
        ctx.drawImage(noiseCvs, -ox, -oy);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => draw();
    vid.addEventListener("play", start);
    if (!vid.paused) draw();
    return () => {
      cancelAnimationFrame(raf);
      vid.removeEventListener("play", start);
    };
  }, []);

  /* ── Crosshair scope — reveals clean video ── */
  useEffect(() => {
    const hero = heroRef.current;
    const canvas = pixCanvasRef.current;
    const crosshair = crosshairRef.current;
    if (!hero || !canvas || !crosshair) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;

    const coord = coordRef.current;
    const lx = lineXRef.current;
    const ly = lineYRef.current;

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      canvas.style.setProperty("--cx", `${curX}px`);
      canvas.style.setProperty("--cy", `${curY}px`);
      crosshair.style.transform = `translate(${curX}px, ${curY}px)`;
      if (lx) lx.style.transform = `translateY(${curY}px)`;
      if (ly) ly.style.transform = `translateX(${curX}px)`;
      if (coord) coord.textContent = `X:${Math.round(curX).toString().padStart(4, "0")}  Y:${Math.round(curY).toString().padStart(4, "0")}`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!active) {
        active = true;
        curX = targetX;
        curY = targetY;
        canvas.style.setProperty("--cx", `${curX}px`);
        canvas.style.setProperty("--cy", `${curY}px`);
        crosshair.style.transform = `translate(${curX}px, ${curY}px)`;
        if (lx) { lx.style.transform = `translateY(${curY}px)`; lx.style.opacity = "1"; }
        if (ly) { ly.style.transform = `translateX(${curX}px)`; ly.style.opacity = "1"; }
        crosshair.style.opacity = "1";
        raf = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      canvas.style.setProperty("--cx", "-9999px");
      canvas.style.setProperty("--cy", "-9999px");
      crosshair.style.opacity = "0";
      if (lx) lx.style.opacity = "0";
      if (ly) ly.style.opacity = "0";
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main>
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative h-[450px] flex flex-col justify-end px-[clamp(24px,4vw,64px)] pb-2.5 border-b border-white/10 overflow-hidden">
        {/* z-0: Clean video — only visible through scope hole */}
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/hero-onas.mp4" type="video/mp4" />
        </video>

        {/* z-2: Grain canvas — rectangular scope punches a hole */}
        <canvas
          ref={pixCanvasRef}
          className="absolute inset-0 w-full h-full z-[2] pointer-events-none grayscale hero-video-glitch"
          style={{
            maskImage: "linear-gradient(black,black), linear-gradient(black,black)",
            maskSize: "100% 100%, 160px 104px",
            maskPosition: "0 0, calc(var(--cx, -9999px) - 80px) calc(var(--cy, -9999px) - 52px)",
            maskRepeat: "no-repeat",
            maskComposite: "exclude",
            WebkitMaskImage: "linear-gradient(black,black), linear-gradient(black,black)",
            WebkitMaskSize: "100% 100%, 160px 104px",
            WebkitMaskPosition: "0 0, calc(var(--cx, -9999px) - 80px) calc(var(--cy, -9999px) - 52px)",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskComposite: "xor",
          } as React.CSSProperties}
        />

        {/* Grain */}
        <div className="moving-grain !opacity-[0.06] z-[3]" />

        {/* Full-width horizontal line */}
        <div
          ref={lineXRef}
          className="absolute top-0 left-0 w-full h-px bg-accent/20 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
        />
        {/* Full-height vertical line */}
        <div
          ref={lineYRef}
          className="absolute top-0 left-0 w-px h-full bg-accent/20 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
        />

        {/* Rectangular crosshair with coordinates */}
        <div
          ref={crosshairRef}
          className="absolute top-0 left-0 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
          style={{ marginLeft: -80, marginTop: -52 }}
        >
          <svg width="160" height="104" viewBox="0 0 160 104" fill="none">
            {/* Outer rect */}
            <rect x="1" y="1" width="158" height="102" stroke="#a3c545" strokeWidth="0.5" opacity="0.35" />
            {/* Corner brackets */}
            <path d="M1 14 L1 1 L14 1" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M146 1 L159 1 L159 14" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M159 90 L159 103 L146 103" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M14 103 L1 103 L1 90" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
            {/* Center cross */}
            <line x1="75" y1="52" x2="85" y2="52" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
            <line x1="80" y1="47" x2="80" y2="57" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
          </svg>
          {/* Coordinates */}
          <span
            ref={coordRef}
            className="absolute bottom-[6px] left-[8px] font-[var(--font-mono)] text-[9px] text-accent/60 tracking-[0.1em]"
          >
            X:0000  Y:0000
          </span>
        </div>

        {/* Bottom gradient fade to bg */}
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-bg via-bg/80 to-transparent z-[3] pointer-events-none" />

        {/* Entrance overlay */}
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-bg z-[5] pointer-events-none"
        />
        <TypewriterTitle
          as="span"
          className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-2.5 relative z-[6] block"
          speed={40}
          delay={300}
        >
          HYDRA ARMS / O nas
        </TypewriterTitle>
        <TypewriterTitle
          as="h1"
          className="text-[clamp(4rem,12vw,140px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
          speed={80}
          delay={1400}
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
          <span className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] pointer-events-none cursor-default">
            <span className="text-white">[</span> <span className="text-accent">Rozpocznij współpracę</span> <span className="text-white">]</span>
          </span>
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
            <span className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] pointer-events-none cursor-default">
              [ Rozpocznij współpracę ]
            </span>
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
                <span className="font-[var(--font-mono)] text-[14px] tracking-[1.12px] pointer-events-none cursor-default mt-auto">
                  <span className="text-white">[</span> <span className="text-accent">Więcej</span> <span className="text-white">]</span>
                </span>
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
              <span className="font-[var(--font-mono)] text-[20px] tracking-[0.2px] pointer-events-none cursor-default">
                <span className="text-white">[</span> <span className="text-accent">Rozpocznij współpracę</span> <span className="text-white">]</span>
              </span>
            </div>
          </div>

          <AnimateIn delay={0.2}>
            <div className="relative h-[306px] overflow-hidden group">
              <img
                src="/us-marines-in-action-2026-01-08-00-35-23-utc.jpg"
                alt="US Marines in action"
                className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.6] contrast-[1.2] transition-all duration-700 group-hover:grayscale-0 group-hover:brightness-[0.8]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
              <div className="absolute inset-0 mix-blend-overlay opacity-[0.08] moving-grain" />
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
