"use client";

import { useRef, useEffect, useState } from "react";

function rngHex(len: number) {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("").toUpperCase();
}

const modules = [
  { id: "R&D", label: "Badania i rozwój" },
  { id: "CNC", label: "Obróbka precyzyjna" },
  { id: "QC", label: "Kontrola jakości" },
  { id: "BAL", label: "Testy balistyczne" },
  { id: "LOG", label: "Logistyka obrotu" },
];

export default function TacticalReadout() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [tick, setTick] = useState(0);

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
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1600);
    return () => clearInterval(id);
  }, [active]);

  const tolerance = (0.001 + Math.random() * 0.004).toFixed(4);
  const batch = `HA-${2024 + Math.floor(tick / 30)}-${String((tick % 999) + 1).padStart(3, "0")}`;
  const yield_ = 96 + Math.floor(Math.random() * 4);

  // Production load bars per module
  const loads = modules.map((_, i) => 40 + Math.floor(Math.random() * 55));

  return (
    <div
      ref={ref}
      className="font-[var(--font-mono)] select-none mt-12 w-full"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      {/* Header */}
      <div
        className="text-[9px] text-text/25 tracking-[0.2em] mb-6 flex justify-between"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.2s",
        }}
      >
        <span>HYDRA ARMS /// MFG</span>
        <span className="text-accent/30">■ ACTIVE</span>
      </div>

      {/* Current batch */}
      <div
        className="mb-5 border-l border-accent/20 pl-3"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateX(0)" : "translateX(-8px)",
          transition: "all 0.4s ease-out 0.3s",
        }}
      >
        <div className="text-[8px] text-text/25 tracking-[0.15em] mb-1">SERIA PRODUKCYJNA</div>
        <div className="text-[11px] text-accent/50">{batch}</div>
      </div>

      {/* Metrics */}
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.5s",
        }}
      >
        <div>
          <div className="text-[8px] text-text/25 tracking-[0.15em] mb-[2px]">TOLERANCJA</div>
          <div className="text-[10px] text-text/45">±{tolerance} mm</div>
        </div>
        <div>
          <div className="text-[8px] text-text/25 tracking-[0.15em] mb-[2px]">WYDAJNOŚĆ</div>
          <div className="text-[10px] text-text/45">{yield_}%</div>
        </div>
        <div>
          <div className="text-[8px] text-text/25 tracking-[0.15em] mb-[2px]">NORMA</div>
          <div className="text-[10px] text-text/45">STANAG</div>
        </div>
        <div>
          <div className="text-[8px] text-text/25 tracking-[0.15em] mb-[2px]">CERT</div>
          <div className="text-[10px] text-text/45">NATO {rngHex(4)}</div>
        </div>
      </div>

      {/* Module loads */}
      <div
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.7s",
        }}
      >
        <div className="text-[8px] text-text/25 tracking-[0.15em] mb-2">OBCIĄŻENIE MODUŁÓW</div>
        <div className="flex flex-col gap-[5px]">
          {modules.map((mod, i) => (
            <div key={mod.id} className="flex items-center gap-2">
              <span className="text-[8px] text-text/25 w-[22px] shrink-0">{mod.id}</span>
              <div className="flex-1 h-[5px] bg-white/[0.03] relative overflow-hidden">
                <div
                  className="h-full absolute left-0 top-0"
                  style={{
                    width: `${loads[i]}%`,
                    background: loads[i] > 85
                      ? "var(--color-accent)"
                      : `rgba(255,255,255,${0.08 + (loads[i] / 100) * 0.12})`,
                    opacity: loads[i] > 85 ? 0.6 : 0.45,
                    transition: "width 1.2s ease-in-out",
                  }}
                />
              </div>
              <span className="text-[8px] text-text/20 w-[24px] text-right">{loads[i]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-5 text-[8px] text-text/15 tracking-[0.1em]"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.9s",
        }}
      >
        SN::{rngHex(12)}
      </div>
    </div>
  );
}
