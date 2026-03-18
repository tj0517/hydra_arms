"use client";

import { useRef, useEffect, useState } from "react";

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
  const ref = useRef<HTMLElement>(null);
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setStarted(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  useEffect(() => {
    if (!started || done) return;

    if (displayed.length < children.length) {
      const timeout = setTimeout(() => {
        setDisplayed(children.slice(0, displayed.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setDone(true);
    }
  }, [started, displayed, children, speed, done]);

  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={className}>
      {started ? displayed : "\u00A0"}
      {started && !done && (
        <span className="inline-block w-[0.5em] h-[1em] bg-accent ml-[2px] align-middle animate-pulse" />
      )}
    </Tag>
  );
}
