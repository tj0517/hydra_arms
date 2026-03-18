"use client";

import { useRef, useEffect } from "react";

export default function AsciiHelicopter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = sectionRef.current;
    const pre = preRef.current;
    const video = videoRef.current;
    if (!el || !pre || !video) return;

    const probe = document.createElement("span");
    probe.style.cssText =
      "font-family:var(--font-jetbrains-mono),monospace;font-size:8px;line-height:1.2;position:absolute;visibility:hidden;white-space:pre";
    probe.textContent = "0";
    el.appendChild(probe);
    const cw = probe.offsetWidth || 5;
    const ch = probe.offsetHeight || 10;
    el.removeChild(probe);

    const cols = Math.floor(el.clientWidth / cw);
    const rows = Math.floor(el.clientHeight / ch);
    if (cols < 10 || rows < 10) return;

    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const LEVELS = 6;
    const THRESHOLD = 0.85;

    const levelStyles: string[] = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const gray = Math.round(45 + t * 155);
      const op = (0.28 + t * 0.52).toFixed(2);
      const hex = gray.toString(16).padStart(2, "0");
      levelStyles[l] = `color:#${hex}${hex}${hex};opacity:${op}`;
    }
    const COL_BG = "color:#505050;opacity:0.25";

    const total = rows * cols;
    const charGrid = new Array<string>(total);
    for (let i = 0; i < total; i++) {
      charGrid[i] = Math.random() > 0.5 ? "0" : "1";
    }

    // Cover-fit
    const vidAspect = 1280 / 720;
    const gridAspect = (cols * cw) / (rows * ch);
    let sx = 0, sy = 0, sw = 1280, sh = 720;
    if (gridAspect > vidAspect) {
      const newH = 1280 / gridAspect * (cw / ch);
      sy = (720 - newH) / 2;
      sh = newH;
    } else {
      const newW = 720 * gridAspect * (ch / cw);
      sx = (1280 - newW) / 2;
      sw = newW;
    }

    const bright = new Float32Array(total);
    const lvl = new Uint8Array(total);

    const renderFrame = () => {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
      const { data } = ctx.getImageData(0, 0, cols, rows);

      for (let i = 0; i < total; i++) {
        const p = i * 4;
        bright[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
        if (bright[i] < THRESHOLD) {
          lvl[i] = Math.min(LEVELS - 1, (Math.pow(bright[i] / THRESHOLD, 0.7) * LEVELS) | 0);
        }
      }

      const parts: string[] = [];
      for (let r = 0; r < rows; r++) {
        if (r > 0) parts.push("\n");
        let c = 0;
        const rOff = r * cols;
        while (c < cols) {
          const isPlane = bright[rOff + c] < THRESHOLD;

          if (!isPlane) {
            let end = c + 1;
            while (end < cols && bright[rOff + end] >= THRESHOLD) end++;
            const len = end - c;
            parts.push('<span style="', COL_BG, '">');
            // Bulk "1" string
            parts.push("1".repeat(len));
            parts.push("</span>");
            c = end;
          } else {
            const level = lvl[rOff + c];
            let end = c + 1;
            while (end < cols && bright[rOff + end] < THRESHOLD && lvl[rOff + end] === level) end++;
            parts.push('<span style="', levelStyles[level], '">');
            for (let i = c; i < end; i++) parts.push(charGrid[rOff + i]);
            parts.push("</span>");
            c = end;
          }
        }
      }
      pre.innerHTML = parts.join("");
    };

    // Forward/reverse seeking
    const STEP = 1 / 24;
    let direction = 1;
    let last = 0;

    const tick = (time: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (time - last < 42) return; // 24fps
      last = time;
      if (video.readyState < 2) return;

      renderFrame();

      let next = video.currentTime + direction * STEP;
      if (next >= video.duration) {
        next = video.duration - STEP;
        direction = -1;
      } else if (next <= 0) {
        next = STEP;
        direction = 1;
      }
      video.currentTime = next;
    };

    const onCanPlay = () => {
      video.pause();
      rafRef.current = requestAnimationFrame(tick);
    };

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.load();

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("canplay", onCanPlay);
      video.pause();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-bg overflow-hidden">
      <div className="ls-scanlines" />
      <video
        ref={videoRef}
        src="/Looping_Video_Ready.mp4"
        muted
        playsInline
        preload="auto"
        className="hidden"
      />
      <pre
        ref={preRef}
        className="absolute inset-0 font-[var(--font-mono)] text-[8px] leading-[1.2] select-none whitespace-pre overflow-hidden"
      />
    </section>
  );
}
