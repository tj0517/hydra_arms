"use client";

import { useRef, useEffect, useState } from "react";

interface TypeWriterProps {
  lines: string[];
  className?: string;
  speed?: number;
  delay?: number;
}

export default function TypeWriter({
  lines,
  className = "",
  speed = 40,
  delay = 0,
}: TypeWriterProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started || currentLine >= lines.length) return;

    if (currentChar < lines[currentLine].length) {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[currentLine] = (next[currentLine] || "") + lines[currentLine][currentChar];
          return next;
        });
        setCurrentChar((c) => c + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [started, currentLine, currentChar, lines, speed]);

  return (
    <div ref={ref} className={className}>
      {displayedLines.map((line, i) => (
        <div key={i}>
          {line}
          {i === currentLine && (
            <span className="inline-block w-[6px] h-[14px] bg-accent ml-0.5 animate-pulse" />
          )}
        </div>
      ))}
      {displayedLines.length === 0 && started && (
        <div>
          <span className="inline-block w-[6px] h-[14px] bg-accent ml-0.5 animate-pulse" />
        </div>
      )}
    </div>
  );
}
