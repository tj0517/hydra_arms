"use client";

import { useRef, useEffect, useState } from "react";

export default function BlueprintSketch() {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

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

  // Animate stroke-dashoffset on all drawing elements
  useEffect(() => {
    if (!active || !ref.current) return;
    const els = ref.current.querySelectorAll(".bp-draw");
    els.forEach((el, i) => {
      const svgEl = el as SVGGeometryElement;
      if (typeof svgEl.getTotalLength !== "function") return;
      const len = svgEl.getTotalLength();
      svgEl.style.strokeDasharray = String(len);
      svgEl.style.strokeDashoffset = String(len);
      svgEl.style.animation = `svgDraw ${0.6 + Math.random() * 0.8}s ease-out ${0.2 + i * 0.1}s forwards`;
    });
  }, [active]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 320 360"
      className="w-full max-w-[380px]"
      fill="none"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.4s ease-out" }}
    >
      {/* Construction grid lines */}
      {[80, 140, 200, 260].map((y) => (
        <line key={`h${y}`} x1="20" y1={y} x2="300" y2={y} stroke="#b8d95a" strokeWidth="0.3" opacity="0.07" className="bp-draw" />
      ))}
      {[80, 160, 240].map((x) => (
        <line key={`v${x}`} x1={x} y1="40" x2={x} y2="320" stroke="#b8d95a" strokeWidth="0.3" opacity="0.07" className="bp-draw" />
      ))}

      {/* Barrel profile — simplified cross-section */}
      <line x1="40" y1="155" x2="280" y2="155" stroke="#b8d95a" strokeWidth="0.6" opacity="0.2" className="bp-draw" />
      <line x1="40" y1="175" x2="280" y2="175" stroke="#b8d95a" strokeWidth="0.6" opacity="0.2" className="bp-draw" />

      {/* Tapered end */}
      <line x1="280" y1="155" x2="300" y2="160" stroke="#b8d95a" strokeWidth="0.6" opacity="0.2" className="bp-draw" />
      <line x1="280" y1="175" x2="300" y2="170" stroke="#b8d95a" strokeWidth="0.6" opacity="0.2" className="bp-draw" />
      <line x1="300" y1="160" x2="300" y2="170" stroke="#b8d95a" strokeWidth="0.5" opacity="0.15" className="bp-draw" />

      {/* Chamber section */}
      <rect x="40" y="148" width="60" height="34" stroke="#b8d95a" strokeWidth="0.5" opacity="0.15" className="bp-draw" />
      <line x1="40" y1="165" x2="100" y2="165" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" strokeDasharray="2 3" className="bp-draw" />

      {/* Rifling detail */}
      {[120, 145, 170, 195, 220, 245].map((x) => (
        <line key={`r${x}`} x1={x} y1="158" x2={x} y2="172" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" className="bp-draw" />
      ))}

      {/* Center axis */}
      <line x1="30" y1="165" x2="310" y2="165" stroke="#b8d95a" strokeWidth="0.3" opacity="0.08" strokeDasharray="4 6" className="bp-draw" />

      {/* Dimension line — top */}
      <line x1="40" y1="120" x2="280" y2="120" stroke="#b8d95a" strokeWidth="0.4" opacity="0.15" className="bp-draw" />
      <line x1="40" y1="116" x2="40" y2="148" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" className="bp-draw" />
      <line x1="280" y1="116" x2="280" y2="148" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" className="bp-draw" />
      {/* Dimension arrows */}
      <path d="M40 120 L46 118 L46 122 Z" fill="#b8d95a" opacity="0.15" className="bp-draw" />
      <path d="M280 120 L274 118 L274 122 Z" fill="#b8d95a" opacity="0.15" className="bp-draw" />

      {/* Dimension line — vertical */}
      <line x1="20" y1="148" x2="20" y2="182" stroke="#b8d95a" strokeWidth="0.4" opacity="0.15" className="bp-draw" />
      <line x1="16" y1="148" x2="40" y2="148" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" className="bp-draw" />
      <line x1="16" y1="182" x2="40" y2="182" stroke="#b8d95a" strokeWidth="0.3" opacity="0.1" className="bp-draw" />

      {/* Cross-section circle (bore) */}
      <circle cx="160" cy="260" r="28" stroke="#b8d95a" strokeWidth="0.5" opacity="0.18" className="bp-draw" />
      <circle cx="160" cy="260" r="18" stroke="#b8d95a" strokeWidth="0.4" opacity="0.12" className="bp-draw" />
      <circle cx="160" cy="260" r="8" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" className="bp-draw" />
      {/* Cross hairs in circle */}
      <line x1="160" y1="228" x2="160" y2="292" stroke="#b8d95a" strokeWidth="0.3" opacity="0.08" className="bp-draw" />
      <line x1="128" y1="260" x2="192" y2="260" stroke="#b8d95a" strokeWidth="0.3" opacity="0.08" className="bp-draw" />

      {/* Rifling grooves in cross section */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return (
          <line
            key={`g${i}`}
            x1={160 + Math.cos(a) * 18}
            y1={260 + Math.sin(a) * 18}
            x2={160 + Math.cos(a) * 28}
            y2={260 + Math.sin(a) * 28}
            stroke="#b8d95a"
            strokeWidth="0.4"
            opacity="0.12"
            className="bp-draw"
          />
        );
      })}

      {/* Section line indicator */}
      <line x1="160" y1="195" x2="160" y2="225" stroke="#b8d95a" strokeWidth="0.4" opacity="0.12" strokeDasharray="2 2" className="bp-draw" />

      {/* Annotations */}
      <text x="140" y="115" fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.2">
        420mm
      </text>
      <text x="24" y="170" fill="#b8d95a" fontSize="6" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.15" transform="rotate(-90 24 170)">
        Ø34
      </text>
      <text x="145" y="300" fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.2">
        SECT. A-A
      </text>
      <text x="40" y="340" fill="#b8d95a" fontSize="6" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.12">
        HYDRA ARMS /// REF: HA-DWG-0047
      </text>
    </svg>
  );
}
