"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import SplitText from "./SplitText";
import TypeWriter from "./TypeWriter";

interface HeroPageProps {
  title: string;
  section: string;
  sectionNumber: string;
  tag: string;
  hudLeft?: string[];
}

export default function HeroPage({
  title,
  section,
  sectionNumber,
  tag,
  hudLeft,
}: HeroPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Wait for loading screen to finish before starting animations
  useEffect(() => {
    // If loading screen already done (e.g. navigated via client router)
    if (!document.documentElement.classList.contains("loading-active")) {
      setReady(true);
      return;
    }

    const handler = () => setReady(true);
    window.addEventListener("loadingDone", handler);
    return () => window.removeEventListener("loadingDone", handler);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const tl = gsap.timeline({ delay: 0.1 });

    tl.fromTo(
      overlayRef.current,
      { opacity: 1 },
      { opacity: 0, duration: 1.2, ease: "power2.out" }
    );

    if (tagRef.current) {
      tl.fromTo(
        tagRef.current,
        { opacity: 0, x: -20 },
        { opacity: 0.6, x: 0, duration: 0.6, ease: "power3.out" },
        "-=0.4"
      );
    }

    if (scrollRef.current) {
      tl.fromTo(
        scrollRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        "-=0.3"
      );
    }
  }, [ready]);

  return (
    <section className="relative h-screen overflow-hidden bg-bg">
      {/* Black flash overlay for entrance */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-bg z-[15] pointer-events-none"
      />

      {/* Video background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-[1]"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Video mask with text cutout effect */}
      <div className="absolute inset-0 z-[2] bg-black mix-blend-multiply flex flex-col justify-center items-center px-[clamp(24px,4vw,80px)]">
        <SplitText
          as="h1"
          className="text-[clamp(3.5rem,10vw,12rem)] font-black text-accent leading-[0.9] tracking-[-0.04em] uppercase text-center"
          splitBy="chars"
          staggerAmount={0.04}
          delay={ready ? 0.6 : 99}
        >
          {title}
        </SplitText>
      </div>

      {/* HUD UI overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          {/* HUD Left */}
          <div className="absolute top-[100px] left-[clamp(24px,4vw,80px)] hidden md:block">
            <TypeWriter
              lines={
                hudLeft || [
                  `// HYDRA ARMS`,
                  `// SEKCJA: ${section}`,
                  `// STATUS: ACTIVE`,
                ]
              }
              className="font-[var(--font-mono)] text-[11px] text-accent leading-[2.2] opacity-60"
              speed={30}
              delay={ready ? 1000 : 99000}
            />
          </div>

          {/* HUD Right */}
          <div className="absolute top-[100px] right-[clamp(24px,4vw,80px)] font-[var(--font-mono)] text-[11px] text-accent text-right leading-[2.2] opacity-60 hidden md:block">
            <TypeWriter
              lines={[
                `[ SEC: ${sectionNumber} ]`,
                `[ 52°24'N ]`,
                `[ 016°55'E ]`,
              ]}
              speed={30}
              delay={ready ? 1300 : 99000}
            />
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-[clamp(40px,8vh,80px)] left-[clamp(24px,4vw,80px)] right-[clamp(24px,4vw,80px)] flex justify-between items-end">
            <div
              ref={tagRef}
              className="font-[var(--font-mono)] text-xs text-accent tracking-[0.25em] opacity-0"
            >
              {tag}
            </div>
            <div ref={scrollRef} className="flex flex-col items-center gap-2 opacity-0">
              <span className="font-[var(--font-mono)] text-[10px] tracking-[0.2em] text-text-dim [writing-mode:vertical-rl]">
                SCROLL
              </span>
              <div className="w-px h-[50px] bg-white/15 relative overflow-hidden">
                <span className="absolute left-0 w-full h-full bg-accent animate-scrollPulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
