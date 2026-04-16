"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ──────────── Grid helpers ────────────

function empty(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function plot(g: number[][], r: number, c: number) {
  if (r >= 0 && r < g.length && c >= 0 && c < g[0].length) g[r][c] = 1;
}

function line(g: number[][], r0: number, c0: number, r1: number, c1: number) {
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    plot(g, Math.round(r0 + (r1 - r0) * t), Math.round(c0 + (c1 - c0) * t));
  }
}

// ──────────── SVG → grid coordinate mapping ────────────
// Grid sized so each cell is ~7×11px → 34×7=238px, 22×11=242px ≈ square display

const ROWS = 22;
const COLS = 34;
const SX = COLS / 200; // 0.17
const SY = ROWS / 200; // 0.11

function svgPt(svgX: number, svgY: number): [number, number] {
  return [Math.round(svgY * SY), Math.round(svgX * SX)];
}

function ellipseSVG(
  g: number[][], svgCx: number, svgCy: number,
  svgRx: number, svgRy: number,
  fromDeg = 0, toDeg = 360
) {
  // Step small enough to fill every grid cell on the ellipse perimeter
  const perim = 2 * Math.PI * Math.max(svgRx * SX, svgRy * SY);
  const step = Math.max(0.3, 180 / (perim * 4));
  for (let deg = fromDeg; deg <= toDeg; deg += step) {
    const a = (deg * Math.PI) / 180;
    const [r, c] = svgPt(svgCx + svgRx * Math.cos(a), svgCy + svgRy * Math.sin(a));
    plot(g, r, c);
  }
}

function lineSVG(g: number[][], x0: number, y0: number, x1: number, y1: number) {
  const [r0, c0] = svgPt(x0, y0);
  const [r1, c1] = svgPt(x1, y1);
  line(g, r0, c0, r1, c1);
}

// ──────────── Thicken: expand each lit cell to its 4 neighbours ────────────
function thicken(g: number[][]): number[][] {
  const rows = g.length, cols = g[0].length;
  const out = empty(rows, cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (g[r][c]) {
        plot(out, r, c);
        plot(out, r - 1, c);
        plot(out, r + 1, c);
        plot(out, r, c - 1);
        plot(out, r, c + 1);
      }
  return out;
}

// ──────────── Patterns — match SVG icons exactly ────────────

// B2G: 3 nested hexagons (alternating rotation) + 6 spokes
export const HEXAGON: number[][] = (() => {
  const g = empty(ROWS, COLS);
  const cx = 100, cy = 100;

  ([78, 52, 26] as const).forEach((r, k) => {
    const offset = k % 2 === 0 ? -Math.PI / 2 : -Math.PI / 6;
    const verts = Array.from({ length: 6 }, (_, j) => {
      const a = (j / 6) * 2 * Math.PI + offset;
      return svgPt(cx + r * Math.cos(a), cy + r * Math.sin(a));
    });
    for (let i = 0; i < 6; i++)
      line(g, verts[i][0], verts[i][1], verts[(i + 1) % 6][0], verts[(i + 1) % 6][1]);
  });

  // Spokes: center → outer hex vertices
  const [cr, cc] = svgPt(cx, cy);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 2 * Math.PI - Math.PI / 2;
    const [vr, vc] = svgPt(cx + 78 * Math.cos(a), cy + 78 * Math.sin(a));
    line(g, cr, cc, vr, vc);
  }

  return thicken(g);
})();

// B2B: Cylinder — top ellipse, sides, bottom arc, bore, section line
export const CYLINDER: number[][] = (() => {
  const g = empty(ROWS, COLS);

  ellipseSVG(g, 100, 58, 72, 20);          // top face
  lineSVG(g, 28, 58, 28, 152);             // left edge
  lineSVG(g, 172, 58, 172, 152);           // right edge
  ellipseSVG(g, 100, 152, 72, 20, 0, 180); // bottom arc
  ellipseSVG(g, 100, 58, 28, 8);           // inner bore
  ellipseSVG(g, 100, 102, 72, 20);         // dashed section line

  return thicken(g);
})();

// B2C: 5 concentric circles + 4 tick marks
export const TARGET: number[][] = (() => {
  const g = empty(ROWS, COLS);

  [84, 66, 48, 30, 14].forEach(r => ellipseSVG(g, 100, 100, r, r));

  lineSVG(g, 100, 8,   100, 22);
  lineSVG(g, 100, 178, 100, 192);
  lineSVG(g, 8,   100, 22,  100);
  lineSVG(g, 178, 100, 192, 100);

  return thicken(g);
})();

// ──────────── Component ────────────

type Cell = { char: string; locked: boolean };

interface Props {
  pattern: number[][];
  className?: string;
}

export default function BinaryIconGrid({ pattern, className }: Props) {
  const rows = pattern.length;
  const cols = pattern[0]?.length ?? 0;
  const total = rows * cols;

  const mkInitial = useCallback(
    (): Cell[] => Array.from({ length: total }, () => ({
      char: Math.random() > 0.5 ? "1" : "0",
      locked: false,
    })),
    [total]
  );

  const [cells, setCells] = useState<Cell[]>(mkInitial);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const animate = useCallback(() => {
    clearAll();
    setCells(mkInitial());

    const scramble = setInterval(
      () => setCells(p => p.map(c => c.locked ? c : { char: Math.random() > 0.5 ? "1" : "0", locked: false })),
      55
    ) as unknown as ReturnType<typeof setTimeout>;
    timers.current.push(scramble);

    const t = setTimeout(() => {
      clearInterval(scramble);

      const idx = Array.from({ length: total }, (_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }

      let cur = 0;
      const resolve = setInterval(() => {
        if (cur >= idx.length) { clearInterval(resolve); return; }
        const batch = idx.slice(cur, cur + 6);
        cur += 6;
        setCells(prev => {
          const next = prev.map(c => ({ ...c }));
          batch.forEach(i => {
            const r = Math.floor(i / cols), c = i % cols;
            next[i] = {
              char: pattern[r][c] ? "1" : (Math.random() > 0.5 ? "1" : "0"),
              locked: true,
            };
          });
          return next;
        });
      }, 18) as unknown as ReturnType<typeof setTimeout>;
      timers.current.push(resolve);
    }, 420);
    timers.current.push(t);
  }, [clearAll, mkInitial, total, cols, pattern]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) animate(); },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearAll(); };
  }, [animate, clearAll]);

  return (
    <div
      ref={containerRef}
      className={`font-mono select-none ${className ?? ""}`}
      onMouseEnter={animate}
    >
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex">
          {Array.from({ length: cols }, (_, c) => {
            const cell = cells[r * cols + c];
            const isShape = !!pattern[r]?.[c];
            return (
              <span
                key={c}
                className={
                  cell.locked && isShape
                    ? "text-accent"
                    : cell.locked
                    ? "text-white/[0.18]"
                    : "text-white/[0.28]"
                }
                style={{ fontSize: "7px", width: "7px", lineHeight: "11px", display: "inline-block", textAlign: "center" }}
              >
                {cell?.char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
