"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export default function HeroCursor({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const container = containerRef.current;
    const cursor = cursorRef.current;
    const spotlight = spotlightRef.current;
    if (!container || !cursor || !spotlight) return;

    // Animate spotlight position with lag
    const updateSpotlight = () => {
      spotlight.style.background = `radial-gradient(circle 250px at ${pos.current.x}px ${pos.current.y}px, transparent 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.4) 100%)`;
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Slow cursor ring
      gsap.to(cursor, {
        x,
        y,
        duration: 0.6,
        ease: "power3.out",
      });

      // Even slower spotlight
      gsap.to(pos.current, {
        x,
        y,
        duration: 0.9,
        ease: "power3.out",
        onUpdate: updateSpotlight,
      });
    };

    const onScroll = () => {
      updateSpotlight();
    };

    const onEnter = () => {
      gsap.to(cursor, { opacity: 1, scale: 1, duration: 0.4 });
      gsap.to(spotlight, { opacity: 1, duration: 0.6 });
    };

    const onLeave = () => {
      gsap.to(cursor, { opacity: 0, scale: 0.5, duration: 0.3 });
      gsap.to(spotlight, { opacity: 0, duration: 0.4 });
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [containerRef]);

  return (
    <>
      {/* Spotlight overlay — dark everywhere except where cursor is */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 z-[2] pointer-events-none opacity-0"
        style={{
          background: "rgba(0,0,0,0.4)",
        }}
      />

      {/* Circle cursor */}
      <div
        ref={cursorRef}
        className="absolute z-[12] pointer-events-none opacity-0"
        style={{
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="absolute inset-0 animate-[spin_12s_linear_infinite]">
          <circle cx="24" cy="24" r="22" stroke="#13ff15" strokeWidth="0.75" opacity="0.4" strokeDasharray="4 6" />
        </svg>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="absolute inset-0">
          <circle cx="24" cy="24" r="16" stroke="#13ff15" strokeWidth="0.5" opacity="0.3" />
          {/* Crosshair ticks */}
          <line x1="24" y1="2" x2="24" y2="8" stroke="#13ff15" strokeWidth="0.75" opacity="0.5" />
          <line x1="24" y1="40" x2="24" y2="46" stroke="#13ff15" strokeWidth="0.75" opacity="0.5" />
          <line x1="2" y1="24" x2="8" y2="24" stroke="#13ff15" strokeWidth="0.75" opacity="0.5" />
          <line x1="40" y1="24" x2="46" y2="24" stroke="#13ff15" strokeWidth="0.75" opacity="0.5" />
          {/* Center dot */}
          <circle cx="24" cy="24" r="1.5" fill="#13ff15" opacity="0.7" />
        </svg>
      </div>
    </>
  );
}
