"use client";

import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  duration?: number;   // ms per path
  stagger?: number;    // ms between paths
}

export default function DrawSVG({ children, className, duration = 1200, stagger = 100 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const reset = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const els = Array.from(svg.querySelectorAll<SVGGeometryElement>("path,line,polyline,polygon,circle,ellipse,rect"));
    els.forEach(el => {
      try {
        const len = el.getTotalLength();
        el.style.transition = "none";
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
      } catch { /* non-geometry elements */ }
    });
    return els;
  };

  const draw = (els: SVGGeometryElement[]) => {
    els.forEach((el, i) => {
      const len = parseFloat(el.style.strokeDasharray);
      if (!len) return;
      void el.getBoundingClientRect();
      el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.2,1) ${i * stagger}ms`;
      el.style.strokeDashoffset = "0";
    });
  };

  useEffect(() => {
    const els = reset();
    if (!els) return;

    const svg = svgRef.current!;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { draw(els); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(svg);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replay = () => {
    const els = reset();
    if (!els) return;
    requestAnimationFrame(() => draw(els));
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      onMouseEnter={replay}
    >
      {children}
    </svg>
  );
}
