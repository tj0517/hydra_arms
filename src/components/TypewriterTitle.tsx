"use client";

import { useRef, useEffect } from "react";

interface TypewriterTitleProps {
  children: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span";
  className?: string;
  speed?: number;
  delay?: number;
}

export default function TypewriterTitle({
  children,
  as: Tag = "h2",
  className = "",
  speed = 45,
  delay = 0,
}: TypewriterTitleProps) {
  const tagRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = tagRef.current;
    const textEl = textRef.current;
    const cursor = cursorRef.current;
    if (!el || !textEl || !cursor) return;

    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    let started = false;

    const type = () => {
      idx++;
      textEl.textContent = children.slice(0, idx);
      if (idx < children.length) {
        timer = setTimeout(type, speed);
      } else {
        cursor.style.display = "none";
      }
    };

    const waitForLoading = () =>
      document.documentElement.classList.contains("loading-active");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const check = () => {
            if (waitForLoading()) {
              requestAnimationFrame(check);
            } else {
              setTimeout(() => {
                cursor.style.display = "inline-block";
                timer = setTimeout(type, speed);
              }, delay);
            }
          };
          check();
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [children, speed, delay]);

  return (
    <Tag ref={tagRef as React.Ref<HTMLHeadingElement>} className={className}>
      <span ref={textRef}>&nbsp;</span>
      <span
        ref={cursorRef}
        className="inline-block w-[0.5em] h-[1em] bg-accent ml-[2px] align-middle animate-pulse"
        style={{ display: "none" }}
      />
    </Tag>
  );
}
