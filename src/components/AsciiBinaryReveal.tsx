"use client";

import { useRef, useEffect } from "react";

// Simplified rifle silhouette as SVG path data — rendered to off-screen canvas
const RIFLE_SVG_PATH = [
  "M 80 180 L 420 180 L 420 200 L 80 200 Z",
  "M 420 172 L 460 172 L 460 208 L 420 208 Z",
  "M 150 155 L 370 155 L 370 180 L 150 180 Z",
  "M 40 165 L 80 160 L 80 210 L 60 220 L 40 220 Z",
  "M 180 200 L 170 280 L 210 280 L 220 200 Z",
  "M 230 200 L 230 250 Q 230 265 245 265 L 275 265 Q 290 265 290 250 L 290 200",
  "M 310 200 L 300 290 L 340 290 L 330 200 Z",
  "M 200 140 L 320 140 L 320 155 L 200 155 Z",
  "M 195 142 Q 190 147 195 152",
  "M 325 142 Q 330 147 325 152",
].join(" ");

export default function AsciiBinaryReveal() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealStartRef = useRef(0);

  // IntersectionObserver to trigger reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && revealStartRef.current === 0) {
          revealStartRef.current = performance.now();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Single render loop
  useEffect(() => {
    const el = sectionRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = el.clientWidth;
    const H = el.clientHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const FONT_SIZE = 7;
    const LINE_HEIGHT = FONT_SIZE * 1.15;
    const FONT = `${FONT_SIZE}px var(--font-jetbrains-mono), monospace`;
    ctx.font = FONT;
    ctx.textBaseline = "top";

    const cw = ctx.measureText("0").width || 4;
    const ch = LINE_HEIGHT;

    const cols = Math.floor(W / cw);
    const rows = Math.floor(H / ch);
    if (cols < 10 || rows < 10) return;

    // Render rifle shape to offscreen canvas
    const shapeCvs = document.createElement("canvas");
    shapeCvs.width = 500;
    shapeCvs.height = 400;
    const shapeCtx = shapeCvs.getContext("2d")!;
    const path = new Path2D(RIFLE_SVG_PATH);
    shapeCtx.fillStyle = "#ffffff";
    shapeCtx.fill(path);
    shapeCtx.strokeStyle = "#ffffff";
    shapeCtx.lineWidth = 2;
    shapeCtx.stroke(path);

    // Sample to character grid
    const sampleCvs = document.createElement("canvas");
    sampleCvs.width = cols;
    sampleCvs.height = rows;
    const sCtx = sampleCvs.getContext("2d")!;

    const imgAspect = 500 / 400;
    const dw = cols;
    const dh = (cols / imgAspect) * (cw / ch);
    const dx = Math.floor((cols - dw) / 2);
    const dy = Math.floor((rows - dh) / 2);
    sCtx.drawImage(shapeCvs, 0, 0, 500, 400, dx, dy, dw, dh);

    const { data } = sCtx.getImageData(0, 0, cols, rows);
    const total = rows * cols;

    const mask = new Uint8Array(total);
    const bright = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const alpha = data[p + 3];
      mask[i] = alpha > 80 ? 1 : 0;
      if (mask[i]) {
        bright[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
      }
    }

    let minB = 1, maxB = 0;
    for (let i = 0; i < total; i++) {
      if (mask[i]) {
        if (bright[i] < minB) minB = bright[i];
        if (bright[i] > maxB) maxB = bright[i];
      }
    }
    const rangeB = maxB - minB || 1;

    // Pre-generate final chars
    const chars = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      chars[i] = Math.random() > 0.5 ? 1 : 0;
    }

    const LEVELS = 10;
    const REVEAL_DURATION = 3000;
    const colLocked = new Uint8Array(cols);
    let raf = 0;
    let done = false;

    function renderFrame(now: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = FONT;
      ctx.textBaseline = "top";

      // Check reveal progress
      const revealStart = revealStartRef.current;
      let revealCol = 0;
      if (revealStart > 0) {
        const elapsed = now - revealStart;
        revealCol = Math.floor((elapsed / REVEAL_DURATION) * cols);
        for (let c = 0; c < Math.min(revealCol, cols); c++) {
          colLocked[c] = 1;
        }
      }

      for (let r = 0; r < rows; r++) {
        const y = r * ch;
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * cw;

          let char: string;
          if (colLocked[c]) {
            char = chars[idx] ? "1" : "0";
          } else {
            char = Math.random() > 0.5 ? "1" : "0";
          }

          if (!colLocked[c] || !mask[idx]) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = "#505050";
          } else {
            const norm = (bright[idx] - minB) / rangeB;
            const contrast = Math.pow(norm, 0.7);
            const level = Math.floor(Math.max(0, Math.min(1, contrast)) * (LEVELS - 0.01));
            const t = level / (LEVELS - 1);
            const gray = Math.round(45 + t * 155);
            const hex = gray.toString(16).padStart(2, "0");
            ctx.fillStyle = `#${hex}${hex}${hex}`;
            ctx.globalAlpha = 0.28 + t * 0.52;
          }

          ctx.fillText(char, x, y);
        }
      }
      ctx.globalAlpha = 1;

      // Stop only when fully revealed
      if (revealStart > 0 && revealCol >= cols) {
        done = true;
        return;
      }

      raf = requestAnimationFrame(renderFrame);
    }

    raf = requestAnimationFrame(renderFrame);

    return () => {
      if (!done) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-bg overflow-hidden  border-t border-white/10">
      <div className="ls-scanlines" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 select-none"
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
      <div className="absolute top-0 left-0 right-0 h-[20%] pointer-events-none bg-linear-to-b from-bg via-bg/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[20%] pointer-events-none bg-linear-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
    </section>
  );
}
