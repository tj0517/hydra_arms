"use client";

import { useRef, useEffect } from "react";

export default function MapCrosshair() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const lineXRef = useRef<HTMLDivElement>(null);
  const lineYRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cross = crossRef.current;
    if (!wrap || !cross) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let active = false;
    let raf = 0;

    const lx = lineXRef.current;
    const ly = lineYRef.current;

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      cross.style.transform = `translate(${curX}px, ${curY}px)`;
      if (lx) lx.style.transform = `translateY(${curY}px)`;
      if (ly) ly.style.transform = `translateX(${curX}px)`;
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
        cross.style.transform = `translate(${curX}px, ${curY}px)`;
        if (lx) { lx.style.transform = `translateY(${curY}px)`; lx.style.opacity = "1"; }
        if (ly) { ly.style.transform = `translateX(${curX}px)`; ly.style.opacity = "1"; }
        cross.style.opacity = "1";
        raf = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(raf);
      cross.style.opacity = "0";
      if (lx) lx.style.opacity = "0";
      if (ly) ly.style.opacity = "0";
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
    <div ref={wrapRef} className="absolute inset-0 z-[4] pointer-events-auto" style={{ cursor: "none" }}>
      {/* Full-width horizontal line */}
      <div
        ref={lineXRef}
        className="absolute top-0 left-0 w-full h-px bg-accent/15 pointer-events-none opacity-0 transition-opacity duration-300"
      />
      {/* Full-height vertical line */}
      <div
        ref={lineYRef}
        className="absolute top-0 left-0 w-px h-full bg-accent/15 pointer-events-none opacity-0 transition-opacity duration-300"
      />

      {/* Small cross at intersection */}
      <div
        ref={crossRef}
        className="absolute top-0 left-0 pointer-events-none opacity-0 transition-opacity duration-300"
        style={{ marginLeft: -6, marginTop: -6 }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line x1="0" y1="6" x2="12" y2="6" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
          <line x1="6" y1="0" x2="6" y2="12" stroke="#a3c545" strokeWidth="1" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}
