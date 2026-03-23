"use client";

import { useRef, useEffect } from "react";

export default function AsciiHelicopter() {
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
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

    const img = new Image();
    img.onload = () => {
      // Sample the source image onto a tiny grid
      const sampleCvs = document.createElement("canvas");
      sampleCvs.width = cols;
      sampleCvs.height = rows;
      const sCtx = sampleCvs.getContext("2d")!;

      sCtx.clearRect(0, 0, cols, rows);

      const imgAspect = img.width / img.height;
      const dw = cols;
      const dh = (cols / imgAspect) * (cw / ch);
      const dx = -Math.floor(cols * 0.02);
      const dy = Math.floor((rows - dh) / 2);
      sCtx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

      const { data } = sCtx.getImageData(0, 0, cols, rows);
      const total = rows * cols;

      const mask = new Uint8Array(total);
      const bright = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        const p = i * 4;
        const alpha = data[p + 3];
        mask[i] = alpha > 180 ? 1 : 0;
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

      const LEVELS = 10;
      const REVEAL_DURATION = 2500;

      // Pre-generate final chars
      const chars = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        chars[i] = Math.random() > 0.5 ? 1 : 0;
      }

      const colLocked = new Uint8Array(cols);
      let raf = 0;
      let done = false;

      function renderFrame(now: number) {
        ctx.clearRect(0, 0, W, H);
        ctx.font = FONT;
        ctx.textBaseline = "top";

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
              ctx.globalAlpha = colLocked[c] ? 0.25 : 0.15;
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

        if (revealStart > 0 && revealCol >= cols) {
          done = true;
          return;
        }

        raf = requestAnimationFrame(renderFrame);
      }

      raf = requestAnimationFrame(renderFrame);

      // Cleanup stored in closure
      const cleanup = () => {
        if (!done) cancelAnimationFrame(raf);
      };
      (canvas as any).__cleanup = cleanup;
    };
    img.src = "/plane.png";

    return () => {
      if ((canvas as any).__cleanup) (canvas as any).__cleanup();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-bg overflow-hidden mt-[clamp(2px,12px,64px)] border-t border-white/10">
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
