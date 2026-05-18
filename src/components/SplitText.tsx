"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SplitTextProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  staggerAmount?: number;
  splitBy?: "chars" | "words" | "lines";
  scrollTrigger?: boolean;
  indent?: number;
}

export default function SplitText({
  children,
  className = "",
  as: Tag = "h2",
  delay = 0,
  staggerAmount = 0.03,
  splitBy = "chars",
  indent = 0,
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const text = children;
    let elements: string[];

    if (splitBy === "chars") {
      elements = text.split("");
    } else if (splitBy === "words") {
      elements = text.split(" ");
    } else {
      elements = text.split("\n");
    }

    const indentHtml = indent > 0
      ? Array(indent).fill('<span style="display:inline-block;width:8rem"></span>').join("")
      : "";

    containerRef.current.innerHTML = indentHtml + elements
      .map((el) => {
        if (el === " ") return "&nbsp;";
        const separator = splitBy === "words" ? "&nbsp;" : "";
        return `<span style="display:inline-block;overflow:hidden"><span class="split-char" style="display:inline-block;transform:translateY(100%);opacity:0">${el}${separator}</span></span>`;
      })
      .join("");

    const chars = containerRef.current.querySelectorAll(".split-char");

    gsap.to(chars, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: staggerAmount,
      delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  }, [children, delay, staggerAmount, splitBy]);

  return <Tag ref={containerRef as React.RefObject<HTMLHeadingElement>} className={className} />;
}
