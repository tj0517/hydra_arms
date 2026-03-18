"use client";

import { useRef, useEffect } from "react";

export default function AsciiHelicopter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    const pre = preRef.current;
    if (!el || !pre) return;

    const probe = document.createElement("span");
    probe.style.cssText =
      "font-family:var(--font-jetbrains-mono),monospace;font-size:7px;line-height:1.15;position:absolute;visibility:hidden;white-space:pre";
    probe.textContent = "0";
    el.appendChild(probe);
    const cw = probe.offsetWidth || 4;
    const ch = probe.offsetHeight || 8;
    el.removeChild(probe);

    const cols = Math.floor(el.clientWidth / cw);
    const rows = Math.floor(el.clientHeight / ch);
    if (cols < 10 || rows < 10) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext("2d")!;

      ctx.clearRect(0, 0, cols, rows);

      const imgAspect = img.width / img.height;
      const dw = cols;
      const dh = (cols / imgAspect) * (cw / ch);
      const dx = -Math.floor(cols * 0.02);
      const dy = Math.floor((rows - dh) / 2);
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

      const { data } = ctx.getImageData(0, 0, cols, rows);
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
      const COL_BG = "color:#505050;opacity:0.25";

      const lines: string[] = [];
      for (let r = 0; r < rows; r++) {
        let line = "";
        let c = 0;
        while (c < cols) {
          const idx = r * cols + c;

          if (!mask[idx]) {
            let end = c + 1;
            while (end < cols && !mask[r * cols + end]) end++;
            line += `<span style="${COL_BG}">${"1".repeat(end - c)}</span>`;
            c = end;
          } else {
            const norm = (bright[idx] - minB) / rangeB;
            const contrast = Math.pow(norm, 0.7);
            const level = Math.floor(Math.max(0, Math.min(1, contrast)) * (LEVELS - 0.01));

            let run = Math.random() > 0.5 ? "0" : "1";
            let end = c + 1;
            while (end < cols && mask[r * cols + end]) {
              const e = r * cols + end;
              const en = Math.pow((bright[e] - minB) / rangeB, 0.7);
              const el2 = Math.floor(Math.max(0, Math.min(1, en)) * (LEVELS - 0.01));
              if (el2 !== level) break;
              run += Math.random() > 0.5 ? "0" : "1";
              end++;
            }

            const t = level / (LEVELS - 1);
            const gray = Math.round(45 + t * 155);
            const op = (0.28 + t * 0.52).toFixed(2);
            const hex = gray.toString(16).padStart(2, "0");
            line += `<span style="color:#${hex}${hex}${hex};opacity:${op}">${run}</span>`;
            c = end;
          }
        }
        lines.push(line);
      }
      pre.innerHTML = lines.join("\n");
    };
    img.src = "/plane.png";
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-bg overflow-hidden mt-16 border-t border-white/10">
      <div className="ls-scanlines" />
      <pre
        ref={preRef}
        className="absolute inset-0 font-(--font-mono) text-[7px] leading-[1.15] select-none whitespace-pre overflow-hidden"
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
      <div className="absolute top-0 left-0 right-0 h-[20%] pointer-events-none bg-linear-to-b from-bg via-bg/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[20%] pointer-events-none bg-linear-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
    </section>
  );
}
