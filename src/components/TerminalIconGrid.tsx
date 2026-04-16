"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HEXAGON, CYLINDER, TARGET } from "./BinaryIconGrid";
export { HEXAGON, CYLINDER, TARGET };

const COLS = 34;
const ROWS = 22;

interface Props {
  pattern: number[][];
  className?: string;
}

export default function TerminalIconGrid({ pattern, className }: Props) {
  // -1 = not started, 0..COLS-1 = cursor column, COLS = done
  const [cursor, setCursor] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCursor(-1);
    // small delay before starting
    const start = setTimeout(() => {
      let col = 0;
      timerRef.current = setInterval(() => {
        setCursor(col);
        col++;
        if (col > COLS) clearInterval(timerRef.current!);
      }, 18);
    }, 120);
    return () => clearTimeout(start);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) animate(); },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className={`font-mono select-none ${className ?? ""}`}
      onMouseEnter={animate}
    >
      {Array.from({ length: ROWS }, (_, r) => (
        <div key={r} className="flex">
          {Array.from({ length: COLS }, (_, c) => {
            const isShape = !!pattern[r]?.[c];
            const revealed = cursor >= 0 && c < cursor;
            const isCursor = c === cursor;
            const pending = cursor < 0 || c > cursor;

            let char: string;
            let style: string;

            if (pending) {
              char = "░";
              style = "text-white/[0.22]";
            } else if (isCursor) {
              char = isShape ? "█" : "▌";
              style = isShape ? "text-accent brightness-150" : "text-white/60";
            } else if (revealed) {
              char = isShape ? "█" : "░";
              style = isShape ? "text-accent" : "text-white/[0.18]";
            } else {
              char = "░";
              style = "text-white/[0.07]";
            }

            return (
              <span
                key={c}
                className={style}
                style={{
                  fontSize: "7px",
                  width: "7px",
                  lineHeight: "11px",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                {char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
