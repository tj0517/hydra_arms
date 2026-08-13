"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import TypewriterTitle from "@/components/TypewriterTitle";
import { useGraphicsCapability } from "@/lib/GraphicsCapabilityContext";

interface SubpageHeroProps {
  subtitle: string;
  title: string;
  titleClass?: string;
  video: string;
}

export default function SubpageHero({ subtitle, title, titleClass, video }: SubpageHeroProps) {
  const { lowGraphicsMode } = useGraphicsCapability();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const lineXRef = useRef<HTMLDivElement>(null);
  const lineYRef = useRef<HTMLDivElement>(null);

  /* ── Video playback + glitch on loop ── */
  useEffect(() => {
    const vid = videoRef.current;
    const overlay = overlayRef.current;
    const hero = heroRef.current;
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

    // Pause video when hero scrolls fully out of view, resume when back
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: 0 }
    );
    if (hero) obs.observe(hero);

    const onSeeked = () => {
      if (!overlay || vid.currentTime > 0.5) return;
      overlay.classList.remove("glitch-once");
      void overlay.offsetWidth;
      overlay.classList.add("glitch-once");
    };

    vid.addEventListener("seeked", onSeeked);
    return () => {
      vid.removeEventListener("seeked", onSeeked);
      obs.disconnect();
    };
  }, []);

  /* ── Crosshair scope — reveals clean video ── */
  useEffect(() => {
    const hero = heroRef.current;
    const overlay = overlayRef.current;
    const crosshair = crosshairRef.current;
    if (!hero || !overlay || !crosshair || lowGraphicsMode) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;

    const coord = coordRef.current;
    const lx = lineXRef.current;
    const ly = lineYRef.current;

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      overlay.style.setProperty("--cx", `${curX}px`);
      overlay.style.setProperty("--cy", `${curY}px`);
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
        overlay.style.setProperty("--cx", `${curX}px`);
        overlay.style.setProperty("--cy", `${curY}px`);
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
      overlay.style.setProperty("--cx", "-9999px");
      overlay.style.setProperty("--cy", "-9999px");
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
    <section ref={heroRef} className="relative h-[280px] sm:h-[360px] md:h-[450px] flex flex-col justify-end px-[clamp(32px,5vw,64px)] pb-2.5 border-b border-white/10 overflow-hidden">
      {/* Clean video — visible through scope hole */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        poster="/video/hero-poster.jpg"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={video.replace('.mp4', '.webm')} type="video/webm" />
        <source src={video} type="video/mp4" />
      </video>

      {/* Dark overlay — in lowGraphicsMode: simple flat overlay (no backdrop-filter/mask compositing) */}
      <div
        ref={overlayRef}
        className="absolute inset-0 w-full h-full z-[2] pointer-events-none hero-video-glitch"
        style={lowGraphicsMode ? {
          background: "rgba(10,10,11,0.72)",
        } : {
          background: "rgba(10,10,11,0.72)",
          backdropFilter: "grayscale(1) brightness(0.55)",
          WebkitBackdropFilter: "grayscale(1) brightness(0.55)",
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

      {/* Scope cursor elements — skipped in lowGraphicsMode */}
      {!lowGraphicsMode && (
        <>
          <div
            ref={lineXRef}
            className="absolute top-0 left-0 w-full h-px bg-accent/20 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
          />
          <div
            ref={lineYRef}
            className="absolute top-0 left-0 w-px h-full bg-accent/20 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
          />
          <div
            ref={crosshairRef}
            className="absolute top-0 left-0 z-[4] pointer-events-none opacity-0 transition-opacity duration-300"
            style={{ marginLeft: -80, marginTop: -52 }}
          >
            <svg width="160" height="104" viewBox="0 0 160 104" fill="none">
              <rect x="1" y="1" width="158" height="102" stroke="#a3c545" strokeWidth="0.5" opacity="0.35" />
              <path d="M1 14 L1 1 L14 1" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
              <path d="M146 1 L159 1 L159 14" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
              <path d="M159 90 L159 103 L146 103" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
              <path d="M14 103 L1 103 L1 90" stroke="#a3c545" strokeWidth="1.5" fill="none" opacity="0.8" />
              <line x1="75" y1="52" x2="85" y2="52" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
              <line x1="80" y1="47" x2="80" y2="57" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
            </svg>
            <span
              ref={coordRef}
              className="absolute bottom-[6px] left-[8px] font-[var(--font-mono)] text-[9px] text-accent/60 tracking-[0.1em]"
            >
              X:0000  Y:0000
            </span>
          </div>
        </>
      )}

      {/* Bottom gradient fade to bg */}
      <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-bg via-bg/80 to-transparent z-[3] pointer-events-none" />

      {/* Entrance overlay */}
      <div
        className="absolute inset-0 bg-bg z-[5] pointer-events-none hero-overlay-fade"
      />
      <TypewriterTitle
        as="span"
        className="font-[var(--font-mono)] text-[14px] text-accent tracking-[1.12px] uppercase mb-2.5 relative z-[6] block"
        speed={40}
        delay={300}
      >
        {subtitle}
      </TypewriterTitle>
      <TypewriterTitle
        as="h1"
        className={titleClass || "text-[clamp(2.5rem,12vw,140px)] font-semibold text-white leading-none tracking-[-2px] md:tracking-[-3px] relative z-[6] ml-[-4px]"}
        speed={80}
        delay={1400}
      >
        {title}
      </TypewriterTitle>
    </section>
  );
}
