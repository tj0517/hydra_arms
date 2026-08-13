"use client";

import { useRef, useEffect } from "react";
import { useGraphicsCapability } from "@/lib/GraphicsCapabilityContext";

export default function GlobalCursor() {
  const { lowGraphicsMode } = useGraphicsCapability();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lowGraphicsMode) return;
    const dot = ref.current;
    if (!dot) return;

    let x = 0, y = 0;
    let rafId = 0;
    let visible = false;

    const tick = () => {
      dot.style.transform = `translate(${x}px, ${y}px)`;
      rafId = 0;
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
      }
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [lowGraphicsMode]);

  if (lowGraphicsMode) return null;

  return <div ref={ref} className="global-cursor" style={{ opacity: 0 }} />;
}
