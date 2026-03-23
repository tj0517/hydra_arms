"use client";

import { useRef, useEffect, useState } from "react";

type Variant = "crosshair" | "hud";

interface TechContourSketchProps {
  variant: Variant;
  className?: string;
}

function CrosshairPaths() {
  return (
    <>
      {/* Outer circle */}
      <circle cx="150" cy="120" r="80" fill="none" stroke="#b8d95a" strokeWidth="0.7" opacity="0.35" />
      {/* Middle circle */}
      <circle cx="150" cy="120" r="55" fill="none" stroke="#b8d95a" strokeWidth="0.5" opacity="0.25" />
      {/* Inner circle */}
      <circle cx="150" cy="120" r="28" fill="none" stroke="#b8d95a" strokeWidth="0.6" opacity="0.4" />

      {/* Crosshair lines */}
      <line x1="150" y1="20" x2="150" y2="90" stroke="#b8d95a" strokeWidth="0.5" opacity="0.3" />
      <line x1="150" y1="150" x2="150" y2="220" stroke="#b8d95a" strokeWidth="0.5" opacity="0.3" />
      <line x1="50" y1="120" x2="120" y2="120" stroke="#b8d95a" strokeWidth="0.5" opacity="0.3" />
      <line x1="180" y1="120" x2="250" y2="120" stroke="#b8d95a" strokeWidth="0.5" opacity="0.3" />

      {/* Tick marks on vertical */}
      {[-60, -40, -20, 20, 40, 60].map((offset) => (
        <line
          key={`v${offset}`}
          x1="146"
          y1={120 + offset}
          x2="154"
          y2={120 + offset}
          stroke="#b8d95a"
          strokeWidth="0.4"
          opacity="0.2"
        />
      ))}
      {/* Tick marks on horizontal */}
      {[-60, -40, -20, 20, 40, 60].map((offset) => (
        <line
          key={`h${offset}`}
          x1={150 + offset}
          y1="116"
          x2={150 + offset}
          y2="124"
          stroke="#b8d95a"
          strokeWidth="0.4"
          opacity="0.2"
        />
      ))}

      {/* Corner brackets */}
      <path d="M40 40 L40 55" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M40 40 L55 40" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M260 40 L245 40" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M260 40 L260 55" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M260 200 L260 185" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M260 200 L245 200" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M40 200 L55 200" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M40 200 L40 185" stroke="#b8d95a" strokeWidth="0.5" opacity="0.2" fill="none" />

      {/* Coordinate annotations */}
      <text x="42" y="215" fill="#b8d95a" fontSize="8" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.35">
        AZ: 045.7
      </text>
      <text x="200" y="215" fill="#b8d95a" fontSize="8" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.35">
        RNG: 1247m
      </text>
      <text x="42" y="35" fill="#b8d95a" fontSize="8" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.25">
        ELV: +2.4
      </text>
      <text x="210" y="35" fill="#b8d95a" fontSize="8" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.25">
        WND: 3.2 kn
      </text>
    </>
  );
}

/* ── Interactive HUD variant ── */

function HudSketch({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const sweepRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const mousePos = useRef({ x: 150, y: 130 });

  const CX = 150;
  const CY = 130;
  const R = 80;

  // Mouse tracking on parent SVG
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handler = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 260 / rect.height;
      mousePos.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    svg.addEventListener("mousemove", handler);
    return () => svg.removeEventListener("mousemove", handler);
  }, [svgRef]);

  // Radar sweep rotation + live data updates
  useEffect(() => {
    const sweep = sweepRef.current;
    if (!sweep) return;

    const tick = () => {
      angleRef.current = (angleRef.current + 0.8) % 360;
      sweep.setAttribute("transform", `rotate(${angleRef.current} ${CX} ${CY})`);

      const mx = mousePos.current.x;
      const my = mousePos.current.y;
      const dx = mx - CX;
      const dy = my - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dotRef.current) {
        const clamp = Math.min(dist, R - 4);
        const angle = Math.atan2(dy, dx);
        dotRef.current.setAttribute("cx", String(CX + Math.cos(angle) * clamp));
        dotRef.current.setAttribute("cy", String(CY + Math.sin(angle) * clamp));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const rings = [30, 55, 80];

  return (
    <>
      {/* Radar rings */}
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke="#b8d95a"
          strokeWidth={i === 2 ? 0.7 : 0.4}
          opacity={0.15 + i * 0.08}
          strokeDasharray={i < 2 ? "3 4" : "none"}
        />
      ))}

      {/* Cross lines */}
      <line x1={CX} y1={CY - R - 10} x2={CX} y2={CY + R + 10} stroke="#b8d95a" strokeWidth="0.3" opacity="0.15" />
      <line x1={CX - R - 10} y1={CY} x2={CX + R + 10} y2={CY} stroke="#b8d95a" strokeWidth="0.3" opacity="0.15" />

      {/* Diagonal lines */}
      <line x1={CX - 57} y1={CY - 57} x2={CX + 57} y2={CY + 57} stroke="#b8d95a" strokeWidth="0.2" opacity="0.1" />
      <line x1={CX + 57} y1={CY - 57} x2={CX - 57} y2={CY + 57} stroke="#b8d95a" strokeWidth="0.2" opacity="0.1" />

      {/* Cardinal labels */}
      <text x={CX} y={CY - R - 14} fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.3" textAnchor="middle">N</text>
      <text x={CX} y={CY + R + 20} fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.3" textAnchor="middle">S</text>
      <text x={CX - R - 14} y={CY + 3} fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.3" textAnchor="middle">W</text>
      <text x={CX + R + 14} y={CY + 3} fill="#b8d95a" fontSize="7" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.3" textAnchor="middle">E</text>

      {/* Tick marks around outer ring */}
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const r1 = R - 2;
        const r2 = i % 3 === 0 ? R + 4 : R + 2;
        return (
          <line
            key={i}
            x1={CX + Math.cos(a) * r1}
            y1={CY + Math.sin(a) * r1}
            x2={CX + Math.cos(a) * r2}
            y2={CY + Math.sin(a) * r2}
            stroke="#b8d95a"
            strokeWidth={i % 9 === 0 ? 0.6 : 0.3}
            opacity={i % 9 === 0 ? 0.35 : 0.15}
          />
        );
      })}

      {/* Radar sweep (rotating) */}
      <g ref={sweepRef}>
        <defs>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b8d95a" stopOpacity="0" />
            <stop offset="100%" stopColor="#b8d95a" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d={`M${CX},${CY} L${CX + R},${CY} A${R},${R} 0 0,0 ${CX + R * Math.cos(-Math.PI / 6)},${CY + R * Math.sin(-Math.PI / 6)} Z`}
          fill="url(#sweepGrad)"
        />
        <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke="#b8d95a" strokeWidth="0.8" opacity="0.5" />
      </g>

      {/* Tracking dot (moves with mouse) */}
      <circle ref={dotRef} cx={CX} cy={CY} r="3" fill="#b8d95a" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Dot ring pulse */}
      <circle cx={CX} cy={CY} r="3" fill="none" stroke="#b8d95a" strokeWidth="0.5" opacity="0">
        <animate attributeName="r" values="3;12" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Static blips */}
      {[
        { x: CX + 35, y: CY - 20 },
        { x: CX - 45, y: CY + 30 },
        { x: CX + 15, y: CY + 55 },
      ].map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r="1.5" fill="#b8d95a" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0.05;0.25" dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}

    </>
  );
}

export default function TechContourSketch({ variant, className = "" }: TechContourSketchProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

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

  // Stroke-draw animation for crosshair variant
  useEffect(() => {
    if (!active || !ref.current || variant !== "crosshair") return;

    const elements = ref.current.querySelectorAll("line, circle, path");
    elements.forEach((el, i) => {
      const svgEl = el as SVGGeometryElement;
      if (typeof svgEl.getTotalLength !== "function") return;

      const length = svgEl.getTotalLength();
      svgEl.style.setProperty("--dash-length", String(length));
      svgEl.style.strokeDasharray = String(length);
      svgEl.style.strokeDashoffset = String(length);
      svgEl.style.animation = `svgDraw ${0.8 + Math.random() * 1.2}s ease-out ${i * 0.08}s forwards`;
    });
  }, [active, variant]);

  const viewBox = variant === "crosshair" ? "0 0 300 240" : "0 0 300 260";

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      className={`w-full max-w-[300px] mt-8 ${className}`}
      fill="none"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.3s" }}
    >
      {variant === "crosshair" ? <CrosshairPaths /> : <HudSketch svgRef={ref} />}
    </svg>
  );
}
