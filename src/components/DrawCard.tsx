"use client";

import { useRef, useEffect, useState } from "react";

interface DrawCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function DrawCard({ children, className = "", delay = 0 }: DrawCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setActive(true), delay * 1000);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`draw-card ${active ? "active" : ""} ${className}`}>
      <div className="draw-card-border">
        <span /><span /><span /><span />
      </div>
      <div className="draw-card-content">
        {children}
      </div>
    </div>
  );
}
