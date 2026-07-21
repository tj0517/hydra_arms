"use client";

import { useRef, useEffect } from "react";

const DOT_SPACING = 40;
const DOT_RADIUS = 1.2;
const SWEEP_SPEED = 0.0006;
const PULSE_SPEED = 0.002;
const BLIP_DURATION = 110; // frames at 30fps (~3.6s)

type Contact = {
  angle: number;
  dist: number;
  lastHit: number;
};

const CONTACTS: Contact[] = [
  { angle: 0.42, dist: 0.33, lastHit: -9999 },
  { angle: 1.18, dist: 0.54, lastHit: -9999 },
  { angle: 2.05, dist: 0.41, lastHit: -9999 },
  { angle: 3.47, dist: 0.27, lastHit: -9999 },
  { angle: 4.31, dist: 0.60, lastHit: -9999 },
  { angle: 5.14, dist: 0.38, lastHit: -9999 },
];

export default function TacticalGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const accentHex = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent").trim();
    const cr = parseInt(accentHex.slice(1, 3), 16);
    const cg = parseInt(accentHex.slice(3, 5), 16);
    const cb = parseInt(accentHex.slice(5, 7), 16);
    // Fixed fill/stroke color — alpha set via globalAlpha to avoid string allocs per dot
    const solidColor = `rgb(${cr},${cg},${cb})`;

    let raf = 0;
    let time = 0;
    let mouseX = -1;
    let mouseY = -1;
    let prevSweepAngle = 0;
    let visible = false;
    let lastFrameTime = 0;
    let cw = 0;
    let ch = 0;
    let maxDist = 0;

    // Pre-computed per-dot data — rebuilt on resize only
    let dotX: Float32Array = new Float32Array(0);
    let dotY: Float32Array = new Float32Array(0);
    let dotDist: Float32Array = new Float32Array(0);
    let dotAngle: Float32Array = new Float32Array(0);
    let dotEdge: Float32Array = new Float32Array(0);
    let dotCount = 0;

    const buildDotCache = (w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      maxDist = Math.max(w, h) * 0.55;

      const cols = Math.ceil(w / DOT_SPACING);
      const rows = Math.ceil(h / DOT_SPACING);
      const max = cols * rows;

      dotX = new Float32Array(max);
      dotY = new Float32Array(max);
      dotDist = new Float32Array(max);
      dotAngle = new Float32Array(max);
      dotEdge = new Float32Array(max);
      dotCount = 0;

      for (let x = DOT_SPACING / 2; x < w; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < h; y += DOT_SPACING) {
          const dx = x - cx;
          const dy = y - cy;
          const edgeX = Math.min(x, w - x) / (w * 0.2);
          const edgeY = Math.min(y, h - y) / (h * 0.25);
          const i = dotCount++;
          dotX[i] = x;
          dotY[i] = y;
          dotDist[i] = Math.sqrt(dx * dx + dy * dy);
          dotAngle[i] = Math.atan2(dy, dx);
          dotEdge[i] = Math.min(1, Math.min(edgeX, edgeY));
        }
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);
      buildDotCache(cw, ch);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onLeave = () => { mouseX = -1; mouseY = -1; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const draw = (timestamp: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      if (timestamp - lastFrameTime < 33) return; // ~30fps
      lastFrameTime = timestamp;

      time++;
      const w = cw;
      const h = ch;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const sweepAngle = time * SWEEP_SPEED * Math.PI * 2;
      const PI2 = Math.PI * 2;
      const PI3 = Math.PI * 3;

      // Pulse ring — pre-compute once
      const ringDist = ((time * PULSE_SPEED) * 300) % (Math.max(w, h) * 0.6);
      const hasMouseGlow = mouseX >= 0 && mouseY >= 0;
      const mx = mouseX;
      const my = mouseY;

      // Draw dots using globalAlpha to avoid per-dot string allocation
      ctx.fillStyle = solidColor;
      for (let i = 0; i < dotCount; i++) {
        const x = dotX[i];
        const y = dotY[i];
        const dist = dotDist[i];
        const angle = dotAngle[i];
        const edge = dotEdge[i];

        let opacity = 0.15;

        // Sweep glow
        let ad = angle - sweepAngle;
        ad = ((ad + PI3) % PI2) - Math.PI;
        if (ad > -1.0 && ad < 0) {
          opacity += 0.45 * (1 + ad) * Math.max(0, 1 - dist / maxDist);
        }

        // Pulse ring
        const rd = Math.abs(dist - ringDist);
        if (rd < 40) opacity += 0.25 * (1 - rd / 40);

        // Mouse glow
        if (hasMouseGlow) {
          const mdx = x - mx;
          const mdy = y - my;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < 22500) opacity += 0.4 * (1 - Math.sqrt(md2) / 150);
        }

        opacity = Math.min(opacity * edge, 0.8);
        if (opacity < 0.01) continue; // skip invisible dots

        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Sweep proximity helper
      const sweepProximity = (angle: number) => {
        let diff = angle - sweepAngle;
        diff = ((diff + PI3) % PI2) - Math.PI;
        return (diff > -2.5 && diff < 0) ? 1 + diff / 2.5 : 0;
      };

      // Crosshair
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = solidColor;

      const hProx = Math.max(sweepProximity(0), sweepProximity(Math.PI));
      ctx.globalAlpha = 0.02 + 0.08 * hProx;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

      const vProx = Math.max(sweepProximity(-Math.PI / 2), sweepProximity(Math.PI / 2));
      ctx.globalAlpha = 0.02 + 0.08 * vProx;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      // Radar rings — 12 segments each
      for (const r of [60, 120, 200, 300]) {
        const baseAlpha = r === 60 ? 0.02 : 0.01;
        const maxAlpha = r === 60 ? 0.08 : r === 120 ? 0.06 : r === 200 ? 0.04 : 0.03;
        const segments = 12;
        for (let s = 0; s < segments; s++) {
          const a0 = (s / segments) * PI2;
          const a1 = ((s + 1) / segments) * PI2;
          const prox = sweepProximity((a0 + a1) / 2);
          ctx.globalAlpha = baseAlpha + (maxAlpha - baseAlpha) * prox;
          ctx.beginPath();
          ctx.arc(cx, cy, r, a0, a1);
          ctx.stroke();
        }
      }

      // Sweep line
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * Math.max(w, h) * 0.6,
        cy + Math.sin(sweepAngle) * Math.max(w, h) * 0.6
      );
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Sweep gradient trail
      const gradient = ctx.createConicGradient(sweepAngle, cx, cy);
      gradient.addColorStop(0, `rgba(${cr},${cg},${cb},0.14)`);
      gradient.addColorStop(0.12, `rgba(${cr},${cg},${cb},0)`);
      gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, Math.max(w, h) * 0.5, sweepAngle - 0.8, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Contact blips
      ctx.fillStyle = solidColor;
      ctx.strokeStyle = solidColor;
      const maxRadar = Math.min(w, h) * 0.48;
      const norm = (a: number) => ((a % PI2) + PI2) % PI2;
      const sa = norm(sweepAngle);
      const pa = norm(prevSweepAngle);

      for (const contact of CONTACTS) {
        const ca = norm(contact.angle);
        if (pa < sa ? (ca > pa && ca <= sa) : (ca > pa || ca <= sa)) {
          contact.lastHit = time;
        }

        const px = cx + Math.cos(contact.angle) * contact.dist * maxRadar;
        const py = cy + Math.sin(contact.angle) * contact.dist * maxRadar;
        const age = time - contact.lastHit;

        ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, PI2); ctx.fill();

        if (age < BLIP_DURATION) {
          const t = 1 - age / BLIP_DURATION;

          ctx.globalAlpha = 0.95 * t;
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, PI2); ctx.fill();

          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.65 * t;
          ctx.beginPath(); ctx.arc(px, py, 4 + (1 - t) * 28, 0, PI2); ctx.stroke();

          const t2 = Math.max(0, t - 0.15);
          if (t2 > 0) {
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.3 * t2;
            ctx.beginPath(); ctx.arc(px, py, 4 + (1 - t2) * 22, 0, PI2); ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      prevSweepAngle = sweepAngle;
    };

    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(canvas);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: "crosshair" }}
    />
  );
}
