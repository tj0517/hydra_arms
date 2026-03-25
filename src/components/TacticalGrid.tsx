"use client";

import { useRef, useEffect } from "react";

const ACCENT = "#b8d95a";
const DOT_SPACING = 40;
const DOT_RADIUS = 1.2;
const SWEEP_SPEED = 0.0006;
const PULSE_SPEED = 0.002;

export default function TacticalGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let time = 0;
    let mouseX = -1;
    let mouseY = -1;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
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

    const draw = () => {
      time++;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Radar sweep angle
      const sweepAngle = time * SWEEP_SPEED * Math.PI * 2;

      // Draw dot grid
      for (let x = DOT_SPACING / 2; x < w; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < h; y += DOT_SPACING) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Edge fade — dots near borders become invisible
          const edgeX = Math.min(x, w - x) / (w * 0.2); // 0 at edge, 1 at 20% in
          const edgeY = Math.min(y, h - y) / (h * 0.25);
          const edgeFade = Math.min(1, Math.min(edgeX, edgeY));

          // Base opacity
          let opacity = 0.15;

          // Radar sweep glow — brighten dots near the sweep line
          let angleDiff = angle - sweepAngle;
          // Normalize to [-PI, PI]
          angleDiff = ((angleDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          // Trail effect — dots brighten when sweep passes, fade after
          if (angleDiff > -1.0 && angleDiff < 0) {
            const trail = 1 + angleDiff / 1.0; // 0→1
            opacity += 0.45 * trail * Math.max(0, 1 - dist / (Math.max(w, h) * 0.55));
          }

          // Pulse rings from center
          const pulsePhase = time * PULSE_SPEED;
          const ringDist = (pulsePhase * 300) % (Math.max(w, h) * 0.6);
          const ringDiff = Math.abs(dist - ringDist);
          if (ringDiff < 40) {
            opacity += 0.25 * (1 - ringDiff / 40);
          }

          // Mouse proximity glow
          if (mouseX >= 0 && mouseY >= 0) {
            const mdx = x - mouseX;
            const mdy = y - mouseY;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 150) {
              opacity += 0.4 * (1 - mdist / 150);
            }
          }

          // Apply edge fade
          opacity *= edgeFade;

          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(184,217,90,${Math.min(opacity, 0.8)})`;
          ctx.fill();
        }
      }

      // Helper — how close an angle is to the sweep (0=far, 1=right on it)
      const sweepProximity = (angle: number) => {
        let diff = angle - sweepAngle;
        diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        // Trail behind sweep: recent = bright, far behind = dim
        if (diff > -2.5 && diff < 0) {
          return 1 + diff / 2.5; // 0→1 (0=far behind, 1=just passed)
        }
        return 0;
      };

      // Center crosshair — draw segments with varying opacity
      ctx.lineWidth = 0.5;

      // Horizontal line — sample proximity at right (0) and left (PI)
      const hProxR = sweepProximity(0);
      const hProxL = sweepProximity(Math.PI);
      const hProx = Math.max(hProxR, hProxL);
      const hAlpha = 0.02 + 0.08 * hProx;
      ctx.strokeStyle = `rgba(184,217,90,${hAlpha})`;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Vertical line — sample proximity at top (-PI/2) and bottom (PI/2)
      const vProxT = sweepProximity(-Math.PI / 2);
      const vProxB = sweepProximity(Math.PI / 2);
      const vProx = Math.max(vProxT, vProxB);
      const vAlpha = 0.02 + 0.08 * vProx;
      ctx.strokeStyle = `rgba(184,217,90,${vAlpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      // Center circles — draw arc segments with sweep-dependent opacity
      for (const r of [60, 120, 200, 300]) {
        const baseAlpha = r === 60 ? 0.02 : 0.01;
        const maxAlpha = r === 60 ? 0.08 : r === 120 ? 0.06 : r === 200 ? 0.04 : 0.03;
        const segments = 60;
        for (let s = 0; s < segments; s++) {
          const a0 = (s / segments) * Math.PI * 2;
          const a1 = ((s + 1) / segments) * Math.PI * 2;
          const midAngle = (a0 + a1) / 2;
          const prox = sweepProximity(midAngle);
          const alpha = baseAlpha + (maxAlpha - baseAlpha) * prox;
          ctx.beginPath();
          ctx.arc(cx, cy, r, a0, a1);
          ctx.strokeStyle = `rgba(184,217,90,${alpha})`;
          ctx.stroke();
        }
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * Math.max(w, h) * 0.6,
        cy + Math.sin(sweepAngle) * Math.max(w, h) * 0.6
      );
      ctx.strokeStyle = `rgba(184,217,90,0.35)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sweep line gradient trail
      const gradient = ctx.createConicGradient(sweepAngle, cx, cy);
      gradient.addColorStop(0, "rgba(184,217,90,0.14)");
      gradient.addColorStop(0.12, "rgba(184,217,90,0)");
      gradient.addColorStop(1, "rgba(184,217,90,0)");

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, Math.max(w, h) * 0.5, sweepAngle - 0.8, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
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
