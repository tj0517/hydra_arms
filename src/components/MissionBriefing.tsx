"use client";

import { useRef, useEffect, useState } from "react";

const termLines = [
  { delay: 0.3, text: "> INICJALIZACJA PROTOKOŁU...", type: "dim" },
  { delay: 0.8, text: "> ŁADOWANIE PARAMETRÓW MISJI...", type: "dim" },
  { delay: 1.4, text: "", type: "spacer" },
  { delay: 1.5, text: "  KONCESJA MSWiA", type: "label" },
  { delay: 1.5, text: "  Wytwarzanie / Obrót .............. AKTYWNA", type: "value" },
  { delay: 2.0, text: "", type: "spacer" },
  { delay: 2.1, text: "  REJESTR NATO CAGE", type: "label" },
  { delay: 2.1, text: "  Dostawca kodyfikacyjny ........... ZWERYFIKOWANY", type: "value" },
  { delay: 2.6, text: "", type: "spacer" },
  { delay: 2.7, text: "  ZGODNOŚĆ NORMATYWNA", type: "label" },
  { delay: 2.7, text: "  STANAG / MIL-STD ................. POTWIERDZONA", type: "value" },
  { delay: 3.2, text: "", type: "spacer" },
  { delay: 3.3, text: "  SEKTOR OPERACYJNY", type: "label" },
  { delay: 3.3, text: "  Kraków, Małopolska ............... 50°03'N 19°56'E", type: "value" },
  { delay: 3.8, text: "", type: "spacer" },
  { delay: 3.9, text: "  ZDOLNOŚĆ PRODUKCYJNA", type: "label" },
  { delay: 3.9, text: "  Prototypowanie / Seria ........... GOTOWOŚĆ", type: "value" },
  { delay: 4.4, text: "", type: "spacer" },
  { delay: 4.5, text: "> STATUS OPERACYJNY .................. GOTOWY", type: "final" },
];

export default function MissionBriefing() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const timers = termLines.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, [active]);

  const lineClass = (type: string) => {
    switch (type) {
      case "label": return "text-text/25 tracking-[0.15em]";
      case "value": return "text-accent/45";
      case "final": return "text-accent/60";
      default: return "text-text/30";
    }
  };

  return (
    <div
      ref={ref}
      className="font-[var(--font-mono)] select-none max-w-[420px]"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.5s ease-out" }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-5 text-[11px] text-text/20 tracking-[0.15em]">
        <span className="w-[6px] h-[6px] border border-accent/30" />
        <span>HYDRA ARMS — MISSION BRIEF</span>
      </div>

      {/* Terminal lines */}
      <div className="border-l border-white/8 pl-4 flex flex-col">
        {termLines.map((line, i) => {
          if (line.type === "spacer") {
            return <div key={i} className="h-3" style={{ opacity: i < visibleLines ? 1 : 0 }} />;
          }
          return (
            <div
              key={i}
              className={`text-[13px] leading-[22px] ${lineClass(line.type)}`}
              style={{
                opacity: i < visibleLines ? 1 : 0,
                transform: i < visibleLines ? "translateY(0)" : "translateY(4px)",
                transition: "all 0.3s ease-out",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Blinking cursor */}
      {visibleLines >= termLines.length && (
        <div className="border-l border-white/8 pl-4 mt-1">
          <span
            className="text-[13px] text-accent/40"
            style={{ opacity: cursorVisible ? 1 : 0 }}
          >
            &gt; _
          </span>
        </div>
      )}
    </div>
  );
}
