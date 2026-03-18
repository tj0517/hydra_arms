"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?";

interface ScrambleLinkProps {
  href: string;
  children: string;
  className?: string;
}

export default function ScrambleLink({
  href,
  children,
  className = "",
}: ScrambleLinkProps) {
  const [display, setDisplay] = useState(children);
  const [hasEntered, setHasEntered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const widthRef = useRef<number | null>(null);

  useEffect(() => {
    if (linkRef.current) {
      widthRef.current = linkRef.current.offsetWidth;
    }
  }, [children]);

  const scramble = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const original = children;
    let iteration = 0;

    intervalRef.current = setInterval(() => {
      setDisplay(
        original
          .split("")
          .map((char, i) => {
            if (char === " " || char === "[" || char === "]") return char;
            if (i < iteration) return original[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      iteration += 2;

      if (iteration >= original.length) {
        clearInterval(intervalRef.current!);
        setDisplay(original);
      }
    }, 75);
  }, [children]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplay(children);
  }, [children]);

  // Scramble entrance on scroll into view
  useEffect(() => {
    const el = linkRef.current;
    if (!el || hasEntered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          scramble();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntered, scramble]);

  // Split display into bracket and inner parts for separate styling
  const renderStyled = () => {
    const match = display.match(/^(\[)\s*(.*?)\s*(\])$/);
    if (!match) return <span className="underline text-accent">{display}</span>;
    return (
      <>
        <span className="text-text-dim text-2xl">{match[1]}</span>
        <span className="underline text-accent"> {match[2]} </span>
        <span className="text-text-dim text-2xl">{match[3]}</span>
      </>
    );
  };

  return (
    <a
      ref={linkRef}
      href={href}
      className={className}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      style={widthRef.current ? { minWidth: widthRef.current } : undefined}
    >
      {renderStyled()}
    </a>
  );
}
