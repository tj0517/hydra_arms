"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  duration?: number;
  stagger?: number;
  once?: boolean;
}

export default function AnimateIn({
  children,
  className = "",
  delay = 0,
  y = 40,
  x = 0,
  duration = 0.8,
  once = true,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    if (once) {
      // IntersectionObserver for one-shot entrance — zero ScrollTrigger overhead
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          gsap.fromTo(
            el,
            { opacity: 0, y, x },
            { opacity: 1, y: 0, x: 0, duration, delay, ease: "power3.out" }
          );
        },
        // rootMargin -15% bottom ≈ ScrollTrigger "top 85%"
        { threshold: 0, rootMargin: "0px 0px -15% 0px" }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    // Non-once: keep ScrollTrigger for reversible animations
    const anim = gsap.fromTo(
      el,
      { opacity: 0, y, x },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [y, x, duration, delay, once]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
