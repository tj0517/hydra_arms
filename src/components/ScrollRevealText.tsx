"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGraphicsCapability } from "@/lib/GraphicsCapabilityContext";

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
  const { lowGraphicsMode } = useGraphicsCapability();

  useEffect(() => {
    if (!containerRef.current) return;

    const words = containerRef.current.querySelectorAll(".reveal-word");

    // In lowGraphicsMode skip scrubbed ScrollTrigger — show text at full opacity immediately
    if (lowGraphicsMode) {
      words.forEach((w) => ((w as HTMLElement).style.color = "var(--color-text)"));
      return;
    }

    // Per-word animation (not per-character) — same scroll-sync feel, ~8x fewer DOM updates per frame
    gsap.fromTo(
      words,
      { color: "rgba(192, 200, 199, 0.15)" },
      {
        color: "var(--color-text)",
        stagger: 0.06,
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
  }, [text, lowGraphicsMode]);

  const wordList = text.split(" ");

  return (
    <p ref={containerRef} className={className}>
      {indent > 0 &&
        Array.from({ length: indent }).map((_, i) => (
          <span key={`indent-${i}`} className="inline-block w-10 md:w-32" />
        ))}
      {wordList.map((word, wi) => (
        <span
          key={wi}
          className="reveal-word"
          style={{ color: "rgba(192, 200, 199, 0.15)" }}
        >
          {word}
          {wi < wordList.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
