"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const systems = [
  { id: "01", label: "RADAR" },
  { id: "02", label: "FIRE CONTROL" },
  { id: "03", label: "COMMS" },
  { id: "04", label: "NAV" },
  { id: "05", label: "SSDG /// EDG" },
];

const BAR_COUNT = 8;

export default function SystemStatusHud() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [dataBytes, setDataBytes] = useState("000KB");
  const [bars, setBars] = useState(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => ({
      w: 30 + Math.random() * 60,
      accent: i === 2 || i === 5,
    }))
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Live bar fluctuation + data counter
  const rafRef = useRef(0);
  const tickBars = useCallback(() => {
    setBars((prev) =>
      prev.map((bar) => {
        const delta = (Math.random() - 0.5) * 8;
        const next = Math.max(20, Math.min(95, bar.w + delta));
        return { ...bar, w: next };
      })
    );
    setDataBytes(() => {
      const v = 110 + Math.floor(Math.random() * 20);
      return `${v}KB`;
    });
  }, []);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(tickBars, 1200);
    return () => clearInterval(interval);
  }, [active, tickBars]);

  return (
    <div
      ref={ref}
      className="font-[var(--font-mono)] select-none"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.5s ease-out" }}
    >
      {/* Title */}
      <h3
        className="text-text/50 text-[10px] tracking-[0.15em] uppercase mb-5"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease-out 0.2s",
        }}
      >
        System Status
      </h3>

      {/* System list */}
      <div className="flex flex-col gap-[3px] mb-6">
        {systems.map((sys, i) => (
          <div
            key={sys.id}
            className="flex items-center gap-3 text-[10px] leading-[17px]"
            style={{
              opacity: active ? 1 : 0,
              transform: active ? "translateX(0)" : "translateX(-10px)",
              transition: `all 0.3s ease-out ${0.3 + i * 0.08}s`,
            }}
          >
            <span className="text-text/25">{sys.id}.</span>
            <span className="text-text/40 tracking-[0.08em]">{sys.label}</span>
          </div>
        ))}
      </div>

      {/* Reporting header */}
      <div
        className="flex justify-between items-center text-[9px] tracking-[0.12em] mb-2"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.8s",
        }}
      >
        <span className="text-text/35">REPORTING</span>
        <span className="text-text/25">{dataBytes}/128KB</span>
      </div>

      {/* Bar chart */}
      <div
        className="border-l border-white/8 pl-2.5 flex flex-col gap-[3px]"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.9s",
        }}
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            className="h-[5px]"
            style={{
              width: `${bar.w}%`,
              maxWidth: "80%",
              background: bar.accent
                ? "var(--color-accent)"
                : `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`,
              opacity: bar.accent ? 0.6 : 0.4,
              transition: "width 1s ease-in-out",
            }}
          />
        ))}
      </div>
    </div>
  );
}
