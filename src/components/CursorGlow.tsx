"use client";

import { useRef, useEffect } from "react";

export default function CursorGlow() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const glow = glowRef.current;
    if (!wrap || !glow) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;

    const tick = () => {
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
      glow.style.transform = `translate(${curX}px, ${curY}px)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!active) {
        active = true;
        curX = targetX;
        curY = targetY;
        glow.style.transform = `translate(${curX}px, ${curY}px)`;
        glow.style.opacity = "1";
        raf = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      glow.style.opacity = "0";
    };

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 z-[2] overflow-hidden mix-blend-screen pointer-events-auto">
      <div
        ref={glowRef}
        className="absolute top-0 left-0 pointer-events-none opacity-0 transition-opacity duration-700"
        style={{
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          background: "radial-gradient(circle, rgba(184,217,90,0.25) 0%, rgba(184,217,90,0.08) 30%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
