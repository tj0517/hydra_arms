"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ScrollRevealTextProps {
  text: string;
  className?: string;
  indent?: number;
}

export default function ScrollRevealText({
  text,
  className = "",
  indent = 0,
}: ScrollRevealTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = containerRef.current.querySelectorAll(".reveal-char");

    gsap.fromTo(
      chars,
      { color: "rgba(192, 200, 199, 0.15)" },
      {
        color: "var(--color-text)",
        stagger: 0.02,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          end: "bottom 10%",
          scrub: 1.5,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === containerRef.current) t.kill();
      });
    };
  }, [text]);

  return (
    <p ref={containerRef} className={className}>
      {indent > 0 &&
        Array.from({ length: indent }).map((_, i) => (
          <span key={`indent-${i}`} className="inline-block w-10 md:w-32" />
        ))}
      {text.split(" ").map((word, wi) => (
        <span key={wi}>
          {word.split("").map((char, ci) => (
            <span
              key={ci}
              className="reveal-char"
              style={{ color: "rgba(192, 200, 199, 0.15)" }}
            >
              {char}
            </span>
          ))}
          {wi < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
