"use client";

import { useRef, useState, useCallback } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?";

interface ScrambleLinkProps {
  href: string;
  children: string;
  className?: string;
  disabled?: boolean;
  fill?: boolean;
}

export default function ScrambleLink({
  href,
  children,
  className = "",
  disabled = false,
  fill = false,
}: ScrambleLinkProps) {
  const [display, setDisplay] = useState(children);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

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

  // Split display into bracket and inner parts for separate styling
  const renderStyled = () => {
    const match = display.match(/^(\[)\s*(.*?)\s*(\])$/);
    if (!match) return <span className={`text-accent ${fill ? "group-hover:text-bg transition-colors duration-300" : ""}`}>{display}</span>;
    const hoverClass = fill ? "group-hover:text-bg transition-colors duration-300" : "";
    return (
      <>
        <span className={`text-text-dim text-2xl ${hoverClass}`}>{match[1]}</span>
        <span className={`text-accent ${hoverClass}`}> {match[2]} </span>
        <span className={`text-text-dim text-2xl ${hoverClass}`}>{match[3]}</span>
      </>
    );
  };

  return (
    <a
      ref={linkRef}
      href={disabled ? undefined : href}
      className={`group ${className}`}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      style={disabled ? { cursor: "default" } : undefined}
    >
      {renderStyled()}
    </a>
  );
}
